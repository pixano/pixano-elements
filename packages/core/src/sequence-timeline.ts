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
// TODO: synchronize width with playback-control OR replace the slider by a modified dataZoom
// TODO: adapt datazoom or delete it
// TODO: add a button to expend : only display the current track by default, change height and display 10 or more when clicking on this button OR add a slider : https://stackoverflow.com/questions/61228735/how-to-scroll-with-mouse-wheel-and-keyboard-on-vertical-slider-in-echarts
// TODO: use this.myChart.resize when canvas size changes ?

import { html, customElement, LitElement } from 'lit-element';
import { Annotations } from './annotations-manager';
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
 * SequenceTimeline
 * 
 * Some explanation about data format: [numFrame, tracknum, frameAuthor]
 * - numFrame: number, num of the frame this data bellongs to
 * - tracknum: number, num of the track this data bellongs to
 * - frameAuthor: frameAuthor, source/author of this data
 * - color: color of the track
 * - id: unique identifier of this annotation
 */
@customElement('pxn-sequence-timeline' as any)
export class SequenceTimeline extends LitElement {

	// the chart displaying
	private myChart: any;

	// chart generic parameters
	private nbTracksToBeDisplayed = 3;
	private symbolSize = 20;

	public annotations: Annotations= new Annotations();

	/**
	 * Compute data to be displayed by the timeline from the annotations manager
	 * 
	 * @param {Object} colorForCategory: function to be called to get a color linked to a category
	 */
	updateData(colorForCategory: Function) {

		// 1) extract data to be displayed form annotations
		var flatData: any[] = [];
		var maxTrackNum = 0;

		this.annotations.sequence_annotations.forEach((frame:any, index) => {//for each frame annotations
			// console.log("frame=",frame);
			// console.log("annotations=",frame);
			var numFrame = index;
			frame.forEach((annotation:any) => {
				flatData.push([numFrame, annotation.tracknum, frameAuthor.MANUAL, colorForCategory(annotation.category), annotation.id]);
				if (annotation.tracknum>maxTrackNum) maxTrackNum = annotation.tracknum;
			});
		});
		// separate by track
		var dataSeries: any[] = [];
		for (var i=0; i<=maxTrackNum ; i++) {
			const datai = flatData.filter(d => d[1]===i);
			dataSeries.push(datai);
		}
		// console.log("flatData=",flatData);
		// console.log("dataSeries=",dataSeries);
		
		var series: any[] = [];
		dataSeries.forEach((data,index) => {
			if (data.length) series.push({
				id: index.toString(),
				type: 'line',
				smooth: true,
				symbol: this.callback_symbol,
				symbolSize: this.symbolSize,
				data: data,
				itemStyle: { color: data[0][3] },//'red';
				lineStyle: { color: data[0][3] }
			});
			else console.log("no data for index",index,"in",this.annotations.sequence_annotations);
		});
		this.myChart.setOption({series: series});

		// 2) Add shadow circles (which are not visible) to enable interaction
		this.myChart.setOption({
			graphic: flatData.map(d => {//for each data : create an invisible circle on wich we attach callback functions
				return {
					type: 'circle',
					position: this.myChart.convertToPixel('grid', d), //convertToPixel can only be used in a 'graphic' context
					shape: {
						cx: 0,
						cy: 0,
						r: this.symbolSize / 2
					},
					invisible: true,
					draggable: false,
					onclick: () => this.onPointClick(d),
					onmousemove: () => this.showTooltip(d),
					onmouseout: () => this.hideTooltip(),
					z: 100
				};
			})
			.flat()
		});
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
			left: '5%',
			right: '5%',
			top: '5%',
			bottom: '5%'
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
			max: this.nbTracksToBeDisplayed-1,//start at 0
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
				console.error(`unknown frameAuthor ${value[2]}, should not happen`);
				return 'none';
		}
	}

	/**
	 * Called when the mouse comes over a symbol
	 * => show a message linked to a given symbol
	 */
	showTooltip(data: any[]) {
		this.myChart.dispatchAction({
			type: 'showTip',
			position: 'top',
			dataIndex: data[0],
			seriesIndex: data[1]
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
	 * Called when click on a symbol, i.e. on a precise annotation data point
	 * => dispatches event clickOnData
	 */
	onPointClick(data: any[]) {
		// console.log('clic : data =', data);
		this.dispatchEvent(new CustomEvent('clickOnData', { detail: {frame: data[0], id: data[4]} }));
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
		this.myChart.hideLoading();//not usefull for us

		if (this.option && typeof this.option === 'object') {
			this.myChart.setOption(this.option);
		}
	}

	render() {
		return html`
			<div id="container-pxn-sequence-timeline" style="height: 100%; width: 100%"></div>
			<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/echarts@5.3.0/dist/echarts.min.js"></script>
			`;
	}

}

