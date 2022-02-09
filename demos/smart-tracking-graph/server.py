# Dummy server that receives a polygon and resend one
# Replace in it whatever algorithm you want

from distutils.log import info
from http.server import BaseHTTPRequestHandler, HTTPServer
from json import dumps, loads

import cv2
from tracker_ts import Tracker
import time
import numpy as np
import base64

tracker = Tracker()

""" The HTTP request handler """
class RequestHandler(BaseHTTPRequestHandler):
		
	def _send_cors_headers(self):
		""" Sets headers required for CORS """
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "x-api-key,Content-Type")

	def send_dict_response(self, d):
		""" Sends a dictionary (JSON) back to the client """
		self.wfile.write(bytes(dumps(d), "utf8"))

	def do_OPTIONS(self):
		self.send_response(200)
		self._send_cors_headers()
		self.end_headers()

	def do_GET(self):
		self.send_response(200)
		self._send_cors_headers()
		self.end_headers()

		response = {}
		response["status"] = "OK"
		self.send_dict_response(response)

	def do_POST(self):
		global tracker
		"""Dummy POST request changing input polygon color
		"""
		self.send_response(200)
		self._send_cors_headers()
		self.send_header("Content-Type", "application/json")
		self.end_headers()

		dataLength = int(self.headers["Content-Length"])
		data = self.rfile.read(dataLength)
		decoded = data.decode('utf-8')
		infos = loads(decoded)
		if infos['type'] == 'load':
			print("Model loading in process...")
			tracker.load_model()
			print("Model loaded succesfully")
		elif infos['type'] == 'init':		
			image = self.readb64(infos['image'])
			print(f'Initialization of tracker (id: {infos["id"]})')
			tracker.init_model(image, infos)
			print("The tracker is initizalized")
			# if not tracker.obj_id == infos['id']:
			# 	print(f'Initialization of tracker (id: {infos["id"]})')
			# 	tracker.init_model(image, infos)
			# 	print("The tracker is initizalized")
			# elif tracker.obj_id == infos['id'] and tracker.init_frame == infos["frame_id"]:
			# 	print(f'Re-initialization of tracker (id: {infos["id"]})')
			# 	tracker.init_model(image, infos)
			# 	print("The tracker is initizalized")
			# else:
			# 	print(f'Continue tracking and update dynamic template (fid: {infos["frame_id"]})')
			# 	tracker.update_model(image, infos)
			# tracker.obj_id = infos['id']

		elif infos['type'] == 'update':
			image = self.readb64(infos['image'])
			print(f'Update dynamic template (fid: {infos["frame_id"]})')
			tracker.update_model(image, infos)
			print("The template is up-to-date")
			
		elif infos['type'] == 'run':
			start = time.time()
			image = self.readb64(infos['image'])
			end = time.time()
			res = tracker.run_model(image, infos) 
			end2 = time.time()
			# print(f"Read: {end-start} ms | Run: {end2-end} ms")
			infos['keypoints'] = res["target_kps"]
			infos['visibility'] = res["visible"]
		
		self.send_dict_response(infos)
	
	def readb64(self, uri):
		encoded_data = uri.split(',')[1]
		nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
		img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
		return img



print("Starting server")
httpd = HTTPServer(("127.0.0.1", 4000), RequestHandler)
print("Hosting server on port 4000")
httpd.serve_forever()
