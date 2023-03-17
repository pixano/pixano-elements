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

import {html, LitElement} from 'lit';
import {customElement} from 'lit/decorators.js';
import { annotation, frameAuthor, Annotations } from './annotations-manager';
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

/**
 * SequenceTimeline
 * 
 * Some explanation about data format:
 * - value contains [numFrame, tracknum] interpreted as x,y for display
 * 		- numFrame: number, num of the frame this data bellongs to
 * 		- tracknum: number, num of the track this data bellongs to
 * - createdBy: source/author of this data
 * - color: color of the track
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
		let flatData: any[] = [];
		let maxTrackNum = -1;

		this.annotations.sequence_annotations.forEach((frame:any, index) => {//for each frame annotations
			let numFrame = index;
			frame.forEach((annotation: annotation) => {
				flatData.push({value: [numFrame, annotation.tracknum], createdBy: annotation.origin?.createdBy, color: colorForCategory(annotation.category), id: annotation.id, itemStyle: { color: colorForCategory(annotation.category) } });//a local itemStyle.color enbables to separate color of each point form the whole serie
				if (annotation.tracknum!>maxTrackNum) maxTrackNum = annotation.tracknum!;
			});
		});
		// separate by track
		let dataSeries: any[] = [];
		for (let i=0; i<=maxTrackNum ; i++) {
			const dataTrack = flatData.filter(d => d.value[1]===i);// data for track i
			dataSeries.push(dataTrack);
		}
		
		let series: any[] = [];
		dataSeries.forEach((dataTrack,index) => {
			if (dataTrack.length) series.push({
				id: index.toString(),
				type: 'line',
				smooth: true,
				symbol: this.callback_symbol,
				symbolSize: this.symbolSize,
				data: dataTrack,
				itemStyle: { color: dataTrack[0].color },//default color of each item is the first item's color, will be overwritten for each item
				lineStyle: { color: dataTrack[0].color }//default color of the line is the first item's color
			});
			else console.log("no data for index",index,"in",this.annotations.sequence_annotations);
		});
		this.myChart.setOption(this.option,true);//force update even when removing data
		this.myChart.setOption({series: series});

		// 2) Add shadow circles (which are not visible) to enable interaction
		this.myChart.setOption({
			graphic: flatData.map(d => {//for each data : create an invisible circle on wich we attach callback functions
				return {
					type: 'circle',
					position: this.myChart.convertToPixel('grid', d.value), //convertToPixel can only be used in a 'graphic' context
					shape: {
						cx: 0,
						cy: 0,
						r: this.symbolSize / 2
					},
					invisible: true,
					draggable: false,
					onclick: () => this.onPointClick(d),
					onmousemove: () => this.showTooltip(d.value),
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
					'Click to view this annotation'
					+'<br>frame: '+params.value[0]+' tracknum: '+params.value[1]
					+'<br>createdBy: '+params.data.createdBy;
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
	callback_symbol(_value: any[], params: any) {//on pourrait aussi mettre ici une image via url ('image://url') ou datauri ('image://data:image/gif;base64,R0lG...AAAAAAA')
		switch (params.data.createdBy) {
			case frameAuthor.MANUAL://keyframe
				return 'circle';
			case frameAuthor.INTERP:
				return 'emptyCircle';
			case frameAuthor.TRACKED:
				return 'emptyRect';
			default:
				console.error(`unknown frameAuthor ${params.data.createdBy}, should not happen`);
				return 'emptyTriangle';
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
	onPointClick(data: any) {
		// console.log('clic : data =', data);
		this.dispatchEvent(new CustomEvent('clickOnData', { detail: {frame: data.value[0], id: data.id} }));
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

