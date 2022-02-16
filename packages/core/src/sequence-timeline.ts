/**
 * Implementation of timeline for sequences.
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2022)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 * 
 * This implementation uses apache's echarts. Some doc about it :
 * - npm package : https://www.npmjs.com/package/echarts
 * - doc for options https://echarts.apache.org/en/option.html
 * - doc for the API: https://echarts.apache.org/en/api.html
 * Tip to ease development: use an example like https://echarts.apache.org/examples/en/editor.html?c=line-draggable&lang=ts and edit it. When finished, adapt to this typescript class.
 */
// TODO: share real data
// TODO: synchronize width with playback-control OR replace the slider by a modified dataZoom
// TODO: adapt datazoom or delete it
// TODO: add a button to expend : only display the current track by default, change height and display 10 or more when clicking on this button

import { html, customElement, LitElement } from 'lit-element';
// echarts minimal use
import * as echarts from 'echarts/core';
import {
	TooltipComponent,
	TooltipComponentOption,
	GridComponent,
	GridComponentOption,
	DataZoomComponent,
	DataZoomComponentOption,
	GraphicComponent,
	GraphicComponentOption
} from 'echarts/components';
import { LineChart, LineSeriesOption } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
	TooltipComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	LineChart,
	CanvasRenderer,
	UniversalTransition
]);

type EChartsOption = echarts.ComposeOption<
	| TooltipComponentOption
	| GridComponentOption
	| DataZoomComponentOption
	| GraphicComponentOption
	| LineSeriesOption
	>;

export enum frameAuthor {
	MANUAL = 'manual',
	INTERP = 'interpolated',
	TRACKED= 'tracked'
}

/**
 * 
 */
@customElement('pxn-sequence-timeline' as any)
export class SequenceTimeline extends LitElement {

	// the chart displaying
	private myChart: any;

	// chart generic parameters
	private maxNbTracks = 3;
	private symbolSize = 20;

	/**
	 * Data to be displayed
	 */
	// @property({ type: String })
	private colordata = 'red';
	private data = [
		[5, 0, frameAuthor.MANUAL],
		[10, 0, frameAuthor.MANUAL],
		[11, 0, frameAuthor.INTERP],
		[12, 0, frameAuthor.TRACKED],
		[16, 0, frameAuthor.MANUAL]
	];
	private colordata2 = 'green';
	private data2 = [
		[2, 1, frameAuthor.MANUAL],
		[5, 1, frameAuthor.MANUAL],
		[10, 1, frameAuthor.MANUAL],
		[15, 1, frameAuthor.INTERP],
		[16, 1, frameAuthor.MANUAL]
	];
	private dataConcat = [this.data, this.data2];


	/**
	 * Compute data to be displayed by the timeline from the fulle sequence_annotations
	 */
	set sequenceAnnotations2timelineData(sequence_annotations: []) {
		//TODO : classe pour couleur, tracknum pour ligne
		var newData:any[][] = [];
		var newData2:any[][] = [];
		console.log("sequence_annotations=",sequence_annotations);
		sequence_annotations.forEach((frame:any) => {//for each frame annotations
			console.log("frame=",frame);
			console.log("annotations=",frame.annotations);
			var numFrame = frame.timestamp;//inutile de passer par timestamp si je fait un for classique
			for (var i=0; i<frame.annotations.length ; i++) {
				console.log("i=",i);
				var category = frame.annotations[i].category;//string !!! => convert OR use strings ?
				console.log("category=",category);
				console.log("tracknum=",frame.annotations[i].tracknum);
				if (frame.annotations[i].tracknum===0) newData.push([numFrame, category, frameAuthor.MANUAL]);
				else newData2.push([numFrame, category, frameAuthor.MANUAL]);
				//TODO: vérif : if two objects with same numFrame, error, shoucld not happen
				// if (category==='class1') newData.push([numFrame, category, frameAuthor.MANUAL]);
				// else newData2.push([numFrame, category, frameAuthor.MANUAL]);
			}
		});
		console.log("newData=",newData);
		console.log("newData2=",newData2);
		var newDataConcat = [newData, newData2];
		console.log("newDataConcat=",newDataConcat);
	}

	/**
	 * Main definition of the timeline using echarts
	 */
	private option:EChartsOption = {
		//  title: {
		//    text: 'Try Dragging these Points',
		//    left: 'center'
		//  },
		tooltip: {
			triggerOn: 'none',
			formatter: function (params: any) {
				var message =
					'Click to view this annotation' +
					'<br>frame: ' +
					params.data[0] +
					'<br>track id: ' +
					params.data[1];
				if (params.data[2]) message += '<br>KeyFrame';
				return message;
			}
		},
		grid: {
			top: '8%',
			bottom: '12%'
		},
		xAxis: {
			show: true,
			name: 'frame num',
			min: 0,
			max: 20,
			minInterval: 1,
			offset: (this.symbolSize * 3) / 4, //in number of pixels
			type: 'value',
			axisLine: { onZero: false, show: false },
			splitLine: { show: false }
		},
		yAxis: {
			show: true,
			name: 'track num',
			min: 0,
			max: this.maxNbTracks,
			interval: 1,
			type: 'value',
			axisLine: { onZero: false, show: false }
		},
		dataZoom: [
			{
				type: 'slider',
				backgroundColor: 'white',
				fillerColor: 'rgba(121,0,93,0.75)',
				borderColor: 'rgba(121,0,93,0.75)',
				showDetail: true,
				top: '97%',
				bottom: '6%',
				xAxisIndex: 0,
				labelPrecision: 0,
				filterMode: 'none',
				textStyle: { fontSize: 10, lineHeight: 150 }
			}
		],
		series: [
			{
				id: 'a',
				type: 'line',
				smooth: true,
				symbol: this.callback_symbol,
				symbolSize: this.symbolSize,
				data: this.data,
				itemStyle: { color: this.colordata },
				lineStyle: { color: this.colordata }
			},
			{
				id: '2',
				type: 'line',
				smooth: true,
				symbol: this.callback_symbol,
				symbolSize: this.symbolSize,
				data: this.data2,
				itemStyle: { color: this.colordata2 },
				lineStyle: { color: this.colordata2 }
			}
		]
	};

	/******** callback functions ************/

	/**
	 * Symbol view definition
	 * => a different symbol is used depending on the frame author
	 */
	callback_symbol(value: any[], _params: Object) {//on pourrait aussi mettre ici une image via url ('image://url') ou datauri ('image://data:image/gif;base64,R0lG...AAAAAAA')
		switch (value[2]) {
			case frameAuthor.MANUAL://keyframe
				return 'circle';
			case frameAuthor.INTERP:
				return 'emptyCircle';
			case frameAuthor.TRACKED:
				return 'emptyRect';
			default:
				console.error("unknown frameAuthor, should not happen");
				return 'none';
		}
	}

	/**
	 * Called when the mouse comes over a symbol
	 * => show a message linked to a given symbol
	 */
	showTooltip(dataIndexH: number, dataIndex: number) {
		this.myChart.dispatchAction({
			type: 'showTip',
			seriesIndex: dataIndexH,
			dataIndex: dataIndex
		});
	}

	/**
	 * Called when the mouse comes out of a symbol
	 * => hide the last message
	 */
	hideTooltip() {
		this.myChart.dispatchAction({
			type: 'hideTip'
		});
	}

	/**
	 * Called when clic on a symbol
	 * => TO BE DEFINED
	 */
	onPointClick(dataIndexH: number, dataIndex: number) {
		this.hideTooltip();
		console.log('clic : dataIndexH, dataIndex =', dataIndexH, dataIndex);
	}
	
	/******** render functions ************/
	
	/**
	 * Called after the element’s DOM has been updated the first time
	 */
	protected firstUpdated() {
		// echart has to be defined after Dom creation because it has to be attached to an already defined element
		var chartDom = this.shadowRoot!.getElementById('container-pxn-sequence-timeline')!;
		console.log("chartDom.clientWidth=",chartDom.clientWidth);
		console.log("chartDom.clientHeight=",chartDom.clientHeight);
		this.myChart = echarts.init(chartDom);

		if (this.option && typeof this.option === 'object') {
			this.myChart.setOption(this.option);
		}

		// Add shadow circles (which is not visible) to enable interaction
		this.myChart.setOption({
			graphic: this.dataConcat.map((itemH, dataIndexH) => {//for each data : create an invisible circle on wich we attach callback functions
				return itemH.map((item, dataIndex) => {
					return {
						type: 'circle',
						position: this.myChart.convertToPixel('grid', item), //convertToPixel can only be used in a 'graphic' context
						shape: {
							cx: 0,
							cy: 0,
							r: this.symbolSize / 2
						},
						invisible: true,
						draggable: false,
						onclick: () => {
							this.onPointClick(dataIndexH, dataIndex);
						},
						onmousemove: () => {
							this.showTooltip(dataIndexH, dataIndex);
						},
						onmouseout: () => {
							this.hideTooltip();
						},
						z: 100
					};
				});
			})
			.flat()
		});
	}

	render() {
		console.log("pxn-sequence-timeline render");
		return html`
			<div id="container-pxn-sequence-timeline" style="height: 100%; width: 100%"></div>
			<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/echarts@5.3.0/dist/echarts.min.js"></script>
			`;
	}

}

