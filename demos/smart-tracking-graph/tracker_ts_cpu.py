import numpy as np
import math
from copy import deepcopy
import torch
import cv2

class Preprocessor(object):
    def __init__(self):
        self.mean = torch.tensor([0.485, 0.456, 0.406]).view((1, 3, 1, 1)).cpu()
        self.std = torch.tensor([0.229, 0.224, 0.225]).view((1, 3, 1, 1)).cpu()

    def process(self, img_arr: np.ndarray, amask_arr: np.ndarray):
        # Deal with the image patch
        img_tensor = torch.tensor(img_arr).cpu().float().permute((2,0,1)).unsqueeze(dim=0)
        img_tensor_norm = ((img_tensor / 255.0) - self.mean) / self.std  # (1,3,H,W)
        # Deal with the attention mask
        amask_tensor = torch.from_numpy(amask_arr).to(torch.bool).cpu().unsqueeze(dim=0)  # (1,H,W)
        return img_tensor_norm, amask_tensor

    def process_kps(self, kps: np.ndarray, visibility: np.ndarray):
        # Deal with the image patch
        kps_tensor = kps.cpu().unsqueeze(dim=0)  # (1,H,W)
        # Deal with the attention mask
        amask_arr = ~visibility.astype(np.bool)
        amask_tensor = torch.from_numpy(amask_arr).to(torch.bool).cpu().unsqueeze(dim=0)  # (1,H,W)
        return kps_tensor, amask_tensor

    def transform_coord(self, coord: torch.Tensor, box_extract: torch.Tensor, resize_factor: float,
                                      output_sz, normalize=False) -> torch.Tensor:
        """ Transform the (x,y) co-ordinates from the original image co-ordinates to the co-ordinates of the cropped image
        args:
            coord - the (x,y) coord for which the co-ordinates are to be transformed
            box_extract - the box about which the image crop has been extracted.
            resize_factor - the ratio between the original image scale and the scale of the image crop
            crop_sz - size of the cropped image

        returns:
            numpy.array - transformed co-ordinates of box_in
        """
        # crop_sz = np.array([output_sz, output_sz])
        crop_sz = torch.Tensor([output_sz, output_sz])
        box_extract_center = box_extract[0:2] + 0.5 * box_extract[2:4]

        coord_out = (crop_sz - 1) / 2 + (coord - box_extract_center) * resize_factor

        if normalize:
            return coord_out / crop_sz[0]
        else:
            return coord_out

def sample_target(im, target_bb, search_area_factor, output_sz=None):
    """ Extracts a square crop centered at target_bb box, of area search_area_factor^2 times target_bb area

    args:
        im - cv image
        target_bb - target box [x, y, w, h]
        search_area_factor - Ratio of crop size to target size
        output_sz - (float) Size to which the extracted crop is resized (always square). If None, no resizing is done.

    returns:
        cv image - extracted crop
        float - the factor by which the crop has been resized to make the crop size equal output_size
    """
    if not isinstance(target_bb, list):
        x, y, w, h = target_bb.tolist()
    else:
        x, y, w, h = target_bb
    
    # Crop image
    crop_sz = math.ceil(math.sqrt(w * h) * search_area_factor)

    if crop_sz < 1:
        raise Exception('Too small bounding box.')

    x1 = round(x + 0.5 * w - crop_sz * 0.5)
    x2 = x1 + crop_sz

    y1 = round(y + 0.5 * h - crop_sz * 0.5)
    y2 = y1 + crop_sz

    x1_pad = max(0, -x1)
    x2_pad = max(x2 - im.shape[1] + 1, 0)

    y1_pad = max(0, -y1)
    y2_pad = max(y2 - im.shape[0] + 1, 0)

    # Crop target
    im_crop = im[y1 + y1_pad:y2 - y2_pad, x1 + x1_pad:x2 - x2_pad, :]

    # Pad
    im_crop_padded = cv2.copyMakeBorder(im_crop, y1_pad, y2_pad, x1_pad, x2_pad, cv2.BORDER_CONSTANT)
    # deal with attention mask
    H, W, _ = im_crop_padded.shape
    att_mask = np.ones((H,W))
    end_x, end_y = -x2_pad, -y2_pad
    if y2_pad == 0:
        end_y = None
    if x2_pad == 0:
        end_x = None
    att_mask[y1_pad:end_y, x1_pad:end_x] = 0
    
    if output_sz is not None:
        resize_factor = output_sz / crop_sz
        im_crop_padded = cv2.resize(im_crop_padded, (output_sz, output_sz))
        att_mask = cv2.resize(att_mask, (output_sz, output_sz)).astype(np.bool_)
        return im_crop_padded, resize_factor, att_mask
        
    else:
        return im_crop_padded, att_mask.astype(np.bool_), 1.0


""" Key points tracking """
class TrackerCPU():

	def __init__(self):
		self.model_t = None
		self.model_s = None
		self.preprocessor = Preprocessor()
		self.frame_id = 0
		self.init_frame = -1
		self.obj_id = '-1'
		self.ts_outs_z1 = []
		self.ts_outs_z2 = []
		self.state = None
		self.vis = None
		# Parameters
		self.num_kps = 13
		self.update_intervals = 15
		self.num_extra_template = 1
		self.template_factor = 2.0
		self.template_size = 128
		self.search_factor = 5.0
		self.search_size = 320


	def load_model(self, template_path="template_cpu.pt", search_path="complete_cpu.pt"):
			
		self.model_t = torch.jit.load(template_path).cpu().eval()
		# self.model_t = self.model_t.cpu()
		# self.model_t.eval()

		self.model_s = torch.jit.load(search_path).cpu().eval()
		# self.model_s = self.model_s.cpu()
		# self.model_s.eval()

	def init_model(self, image, info_: dict):
		info = deepcopy(info_)
		# Extract a box
		tempo_k = np.array(deepcopy(info['keypoints']))
		tempo_k = tempo_k.reshape((-1, 2))
		info['visibility'] = np.array(info['visibility'])
		tempo_k = tempo_k[info['visibility'] == 1]
		x1, x2 = min(tempo_k[:, 0]), max(tempo_k[:, 0])
		y1, y2 = min(tempo_k[:, 1]), max(tempo_k[:, 1])
		w, h = (x2 - x1) * 0.1, (y2 - y1) * 0.1  # 0.5 before
		# w, h = max((x2 - x1) * 0.1, 25), max((y2 - y1) * 0.1, 25) # TODO: use a minumum box size
		init_box = [x1 - w, y1 - h, x2 - x1 + 2 * w, y2 - y1 + 2 * h]  # x,y,w,h
		crop_sz = math.ceil(math.sqrt(init_box[2] * init_box[3]) * self.template_factor)
		if crop_sz < 1:
			init_box[2], init_box[3] = 1, 1

		# get the 1st template
		z_patch_arr, rf, z_amask_arr = sample_target(image, init_box, self.template_factor, 
													 output_sz=self.template_size)
		
		template, template_mask = self.preprocessor.process(z_patch_arr, z_amask_arr)
		# get joints
		info['keypoints'] = np.array(info['keypoints']).reshape((-1, 2))
		new_kps = [
            self.preprocessor.transform_coord(torch.tensor(info['keypoints'][joint_idx], dtype=torch.float32),
                                              torch.tensor(init_box), rf,
                                              output_sz=self.template_size, normalize=True)
            for joint_idx in range(self.num_kps)]
		new_kps = torch.stack(new_kps, 0)
		new_kps = new_kps.float()
		joints,  joints_mask = self.preprocessor.process_kps(new_kps, info['visibility'])

		# forward the template once
		with torch.no_grad():
			with torch.jit.optimized_execution(False):
				self.ts_outs_z1 = self.model_t(template, template_mask, joints, joints_mask)
		self.ts_outs_z2 = deepcopy(self.ts_outs_z1)

		self.state = init_box
		self.vis = info['visibility']
		self.frame_id = info['frame_id']
		self.init_frame = info['frame_id']
	
	def run_model(self, image, info_):
		info = deepcopy(info_)
        # Get image infos
		H, W = info['height'], info['width']
		self.frame_id = info['frame_id']

		# Search area
		x_patch_arr, resize_factor, x_amask_arr = sample_target(image, self.state, self.search_factor,
                                                                output_sz=self.search_size)  # (x1, y1, w, h)
		search, search_mask = self.preprocessor.process(x_patch_arr, x_amask_arr)
		with torch.no_grad():
			with torch.jit.optimized_execution(False):
				ts_outs = self.model_s(search, search_mask, self.ts_outs_z1[0], self.ts_outs_z1[1], self.ts_outs_z1[2],
							self.ts_outs_z1[3], self.ts_outs_z1[4], self.ts_outs_z1[5], self.ts_outs_z2[0],
							self.ts_outs_z2[1], self.ts_outs_z2[2], self.ts_outs_z2[3], self.ts_outs_z2[4],
							self.ts_outs_z2[5])
		pred_joints_, pred_logit = ts_outs[0][0], ts_outs[1][0]    # select bs 0
		pred_joints_templates, pred_joints = [], []
		
		for i in range(len(pred_joints_)):
			pred_joints_templates.append((pred_joints_[i] * self.search_size / resize_factor).tolist())
			pred_joints.append(self.clip_point(self.map_point_back(pred_joints_templates[i], resize_factor), H, W,
                                               margin=10))

		# Extract a box from key points & update self.state
		pred_logit = pred_logit.reshape(-1).detach().cpu().numpy()
		pred_logit *= self.vis  # TODO: if the key point has never been seen before, it should be invisible!
		tempo_k = np.array(deepcopy(pred_joints))
		tempo_k = tempo_k[pred_logit >= 0.5]
		if len(tempo_k) > 0:
			x1, x2 = min(tempo_k[:, 0]), max(tempo_k[:, 0])
			y1, y2 = min(tempo_k[:, 1]), max(tempo_k[:, 1])
			w, h = (x2 - x1) * 0.1, (y2 - y1) * 0.1  # 0.5 before
			self.state = [x1 - w, y1 - h, x2 - x1 + 2 * w, y2 - y1 + 2 * h]  # x,y,w,h
			crop_sz = math.ceil(math.sqrt(self.state[2] * self.state[3]) * self.template_factor)
			if crop_sz < 1:
				self.state[2], self.state[3] = 1, 1

		norm_kps = np.array(pred_joints)
		norm_kps[:, 0], norm_kps[:, 1] = norm_kps[:, 0]/W, norm_kps[:, 1]/H
		return {"target_bbox": self.state,
                "target_kps": list(norm_kps.reshape((-1))),
                "conf_score": list(pred_logit),
				"visible": [True if v >= 0.5 else False for v in pred_logit]}
    
	def update_model(self, image, info_:dict):
        # Apply user corrections by updating tracker template
		info = deepcopy(info_)
		H, W = info['height'], info['width']
		info['keypoints'] = np.array(info['keypoints']).reshape((-1, 2))
		info['keypoints'][:, 0] = np.clip(info['keypoints'][:, 0], 0, W)
		info['keypoints'][:, 1] = np.clip(info['keypoints'][:, 1], 0, H)

		tempo_k = np.array(deepcopy(info['keypoints']))
		tempo_k = tempo_k.reshape((-1, 2))
		info['visibility'] = np.array(info['visibility'])
		tempo_k = tempo_k[info['visibility'] >= 0.5]
		tempo_vis = info['visibility']
		a, b = np.array(tempo_vis, dtype=np.int), np.array(self.vis, dtype=np.int)
		self.vis = np.bitwise_or(a, b)

		if len(tempo_k) == 0:
			return
        
		x1, x2 = min(tempo_k[:, 0]), max(tempo_k[:, 0])
		y1, y2 = min(tempo_k[:, 1]), max(tempo_k[:, 1])
		w, h = (x2 - x1) * 0.1, (y2 - y1) * 0.1
        # w, h = max((x2 - x1) * 0.1, 25), max((y2 - y1) * 0.1, 25) # TODO: use a minumum box size
		self.state = [x1 - w, y1 - h, x2 - x1 + 2 * w, y2 - y1 + 2 * h]  # x,y,w,h
		crop_sz = math.ceil(math.sqrt(self.state[2] * self.state[3]) * self.template_factor)
		if crop_sz < 1:
			self.state[2], self.state[3] = 1, 1

		z_patch_arr, rf, z_amask_arr = sample_target(image, self.state, self.template_factor,
                                                     output_sz=self.template_size)  # (x1, y1, w, h)
		template_t, template_mask_t = self.preprocessor.process(z_patch_arr, z_amask_arr)
        # get joints
		new_kps = [
            self.preprocessor.transform_coord(torch.tensor(info['keypoints'][joint_idx], dtype=torch.float32),
                                              torch.tensor(self.state), rf,
                                              output_sz=self.template_size, normalize=True)
            for joint_idx in range(self.num_kps)]
		new_kps = torch.stack(new_kps, 0)
		new_kps = new_kps.float()
		joints_t, joints_mask_t = self.preprocessor.process_kps(new_kps, info['visibility'])

        # update dynamic template
		with torch.no_grad():
			with torch.jit.optimized_execution(False):
				self.ts_outs_z2 = self.model_t(template_t, template_mask_t, joints_t, joints_mask_t)
		
		return

	
	def map_point_back(self, pred_joint: list, resize_factor: float):
		cx_prev, cy_prev = self.state[0] + 0.5 * self.state[2], self.state[1] + 0.5 * self.state[3]
		x, y = pred_joint
		half_side = 0.5 * self.search_size / resize_factor
		cx_real = x + (cx_prev - half_side)
		cy_real = y + (cy_prev - half_side)
		return [cx_real, cy_real]

	def clip_point(self, box: list, h, w, margin=0):
		x1, y1 = box
		x1 = min(max(0, x1), w - margin)
		y1 = min(max(0, y1), h - margin)
		return [x1, y1]