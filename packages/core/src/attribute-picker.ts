/**
 * Utility class to pick labels in a panel
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
 */

import {LitElement, html, css} from 'lit';
import {property, customElement} from 'lit/decorators.js';
import '@material/mwc-icon-button';
import '@material/mwc-dialog';
import '@material/mwc-checkbox';
import '@material/mwc-formfield';
import '@material/mwc-textfield';
import '@material/mwc-select';
import '@material/mwc-list/mwc-list-item';

interface SchemaProperty {
	name: string,
	type: string,
	enum?: [string],
	default: string
};

interface Schema {
	category: [
		{
			name: string,
			color: string,
			idx?: number,
			properties: [SchemaProperty]
		}
	],
	default: string
};

@customElement('attribute-picker' as any)
export class AttributePicker extends LitElement {

	static get styles() {
		return [
			css`
        :host {
          -webkit-touch-callout: none; /* iOS Safari */
            -webkit-user-select: none; /* Safari */
             -khtml-user-select: none; /* Konqueror HTML */
               -moz-user-select: none; /* Old versions of Firefox */
                -ms-user-select: none; /* Internet Explorer/Edge */
                    user-select: none; /* Non-prefixed version, currently
                                          supported by Chrome, Opera and Firefox */
        }
        h3 {
          font-size: 14px;
          margin-left: 10px;
        }
        .category {
          height: 40px;
          display: flex;
          align-items: center;
          padding-left: 10px;
        }
        .category:hover {
          background-color: #ececec;
          cursor: pointer;
        }
        .selected {
          background-color: rgb(230, 230, 230);
          color: var(--secondary-color);
        }
        span.step {
          background: red;
          border-radius: 0.8em;
         -moz-border-radius: 0.8em;
         -webkit-border-radius: 0.8em;
         color: #ffffff;
         display: inline-block;
         line-height: 1.6em;
         margin-right: 15px;
         text-align: center;
         width: 1.6em;
         margin-left: 10px;
        }
        .category > p {
          margin: 0;
          padding-left: 10px;
        }
        .shortcut {
          position: absolute;
          right: 0px;
          z-index: 1;
        }
        #shortcut-table {
          font-family: "Trebuchet MS", Arial, Helvetica, sans-serif;
          border-collapse: collapse;
          width: 100%;
        }

        #shortcut-table td, #shortcut-table th {
          border: 1px solid #ddd;
          padding: 8px;
        }

        #shortcut-table tr:nth-child(even){background-color: #f2f2f2;}

        #shortcut-table tr:hover {background-color: #ddd;}

        #shortcut-table th {
          padding-top: 12px;
          padding-bottom: 12px;
          text-align: left;
          background-color: #4CAF50;
          color: white;
        }
        mwc-select {
            width: 100%;
        }
        mwc-formfield {
          margin: auto;
          width: 70%;
          display: flex;
        }
        `
		]
	}

	@property({ type: Array })
	public shortcuts = [// Array of strings, contains the list of all applicable keyboard shortcuts
		['ALT', 'Switch create/update mode'],
		['CTRL + [0-9]', 'Select category by index'],
		['TAB', 'Navigate through objects'],
		['SHIFT + Tab', 'Navigate through objects (inverse)'],
		['SHIFT + Click', 'Multiple selection'],
		['CTRL + z', 'Undo'],
		['CTRL + SHIFT + z', 'Redo'],
		['CTRL + s', 'Save']
	];
	@property({ type: Boolean })
	public showDetail = false;// Boolean, rendering mode for the selected category (showing all attributes or only the category)
	@property({ type: Object })
	// public schema: { category: [ { name: string, color: string, properties: [{ name: string, default: string }] } ], default: string } = { category: [{name:'', color:'', properties:[]}], default: '' };// shema for this annotation (i.e. category and attributes available for each category in this annotation)
	// public schema: Schema = { category: [{name:'', color:'', properties:[]}], default: '' };// shema for this annotation (i.e. category and attributes available for each category in this annotation)
	public schema: Schema = {} as Schema;
	@property({ type: Object })
	public value: { category: string, options: { [index: string]:any } } = { category: '', options: {} };// {category, options }, contains the value of the current category and its options (i.e. attributes available for this category)
	private mem = '';

	get selectedCategory() {
		return this.schema.category.find((c: any) => c.name === this.value.category);
	}

	getDefaultAttributesForCategory(schema: any, categoryName: string) {
		let category = schema.category?.find((c: any) => c.name === categoryName);
		if (!category && schema.category?.length) {
			category = schema.category[0];
		}
		if (category && category.properties) {
			const d: {[index: string]:any} = {}
			category.properties.forEach((p: SchemaProperty) => {
				d[p.name] = p.default;
			});
			return d;
		}
		return {}
	}

	onKeyDown(event: KeyboardEvent) {
		if (event.ctrlKey) {
			event.preventDefault();
		}
	}

	onKeyUp(event: KeyboardEvent) {
		const isNumber = event.code.replace('Digit', '').replace('Numpad', '')
		if (Number(isNumber) >= 0 && Number(isNumber) <= 9 && event.ctrlKey) {
			event.preventDefault();
			this.mem += isNumber;

		}
		if (event.key === 'Control' && this.mem !== '') {
			event.preventDefault();
			const c = this.schema.category[Number(this.mem)];
			if (c) {
				this.setCategory(c!.name);
			}
			this.mem = '';
		}
	}

	constructor() {
		super();
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
	}

	connectedCallback() {
		super.connectedCallback();
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
	}

	openShortcuts() {
		const d = this.shadowRoot!.querySelector('mwc-dialog');
		d!.open = true;
	}

	/**
	 * Retrieve input text value from change event
	 * @param {Event} e
	 */
	getValue(e: any) {
		const path = e.composedPath();
		const input = path[0];
		const value = input.value;
		return value;
	}

	_getList() {
		try {
			return this.schema.category.map((c) => c.name);
		} catch {
			return [];
		}
	}

	_colorFor(categoryName: any) {
		const category = this.schema.category.find((c) => c.name === categoryName);
		return category ? category.color || 'rgb(0,0,0)' : 'rgb(0,0,0)';
	}

	get defaultValue() {
		const options = this.getDefaultAttributesForCategory(this.schema, this.schema.default);
		return { category: this.schema.default, options };
	}

	setCategory(newCategory: any) {
		const options = this.getDefaultAttributesForCategory(this.schema, newCategory);
		this.value = { category: newCategory, options };
		this._notifyUpdate();
	}

	/**
	 * Triggered when exterior/non-user-triggered
	 * edition of edition label schema
	 * @param {*} entity
	 */
	setAttributes(entity: any) {
		if (entity) {
			entity.options = entity.options || {};
			const options = this.getDefaultAttributesForCategory(this.schema, entity.category);
			Object.keys(options).forEach((key) => {
				if (entity.options.hasOwnProperty(key)) {
					options[key] = JSON.parse(JSON.stringify(entity.options[key]));
				} else {
					options[key] = "";
				}
			});
			// update property choices
			this.value = { category: entity.category, options };
		}
	}

	setAttributesIdx(idx: any) {
		if (idx !== undefined) {
			this.value = { category: this.schema.category.find((c) => c.idx === idx)!.name, options: {} };
		} else {
			const options = this.getDefaultAttributesForCategory(this.schema, this.schema.default);
			this.value = { category: this.schema.default, options };
		}
	}

	reloadSchema(schema: any) {
		this.schema = schema;
		this.value = this.defaultValue;
	}

	_notifyUpdate() {
		this.dispatchEvent(new Event('update'));
	}

	get shortcutsDialog() {
		return html`
        <mwc-dialog>
			<h3>Shortcut list</h3>
			<div>
				<table id="shortcut-table">
					<tr>
						<th>Shortcut</th>
						<th>Description</th>
					</tr>
					${this.shortcuts.map(([k, v]) => {
							return html`<tr><td>${k}</td><td>${v}</td></tr>`;
						})
					}
				</table>
			</div>
			<mwc-button
				slot="secondaryAction"
				dialogAction="cancel">OK</mwc-button>
        </mwc-dialog>
        `
	}

	firstUpdated() {
	}

	htmlProp(prop: any) {
		if (prop.type === 'dropdown') {
			// list of attribute choices
			return html`
				<mwc-select label="${prop.name}" @selected=${(e: any) => {
						const idx = e.detail.index;
						if (this.value.options[prop.name] !== prop.enum[idx]) {
							this.value.options[prop.name] = prop.enum[idx];
							this._notifyUpdate();
						}
					}}>
					${prop.enum.map((sub: any) => {
						return html`<mwc-list-item value="${sub}" ?selected=${this.value.options[prop.name] === sub}>${sub}</mwc-list-item>`
					})}
				</mwc-select>
			`
		} else if (prop.type === 'checkbox') {
			const checked = JSON.parse(JSON.stringify(this.value.options[prop.name]).toLowerCase());// if the initial value was a string like "false" or "False", we want it to be interpreted as a boolean
			return html`
				<mwc-formfield label="${prop.name}">
				<mwc-checkbox ?checked=${checked} @change=${(evt: any) => {
						const path = evt.composedPath();
						const input = path[0];
						if (checked !== input.checked) {
							this.value.options[prop.name] = !checked;
							this.value = { ...this.value };
							this._notifyUpdate();
						}
					}}></mwc-checkbox>
				</mwc-formfield>
			`
		} else if (prop.type === 'textfield') {
			const textval = this.value.options[prop.name];
			return html`
				<mwc-textfield label="${prop.name}" value=${textval} @change=${(evt: any) => {
					this.value.options[prop.name] = this.getValue(evt);
					this.value = { ...this.value };
					this._notifyUpdate();
				}
				}></mwc-textfield>
			`
		}
		return html``;
	}

	get renderDetail() {
		return html`
			<div id="updateEditor" style="width: 100%;" ?hidden=${!this.showDetail}>
				<h3><label>Selected label</label></h3>
				${this.schema.category?.map((category, idx) => {
					return html`
						<div class="category ${category.name === this.value.category ? 'selected' : ''}" id=${category.name} @click=${() => this.setCategory(category.name)}>
							<span class="step" .style="background: ${this._colorFor(category.name)}">${idx}</span><p>${category.name}</p>
						</div>
						${category.properties && category.name === this.value.category ? html`${category.properties.map((prop: any) => this.htmlProp(prop))}` : html``}
					`})}
			</div>`
	}

	get renderSimple() {
		return html`
			<div ?hidden=${this.showDetail}>
				<h3><label>Label for creation</label></h3>
				${this.schema.category?.map((category, idx) => {
					return html`
						<div class="category ${category.name === this.value.category ? 'selected' : ''}" id=${category.name} @click=${() => this.setCategory(category.name)}>
							<span class="step" .style="background: ${this._colorFor(category.name)}">${idx}</span><p>${category.name}</p>
						</div>`
				})}
			</div>
		`;
	}

	/**
	 * Render the element template.
	 */
	render() {
		return html`
			${this.shortcutsDialog}
			<mwc-icon-button class="shortcut" icon="keyboard" @click=${this.openShortcuts}></mwc-icon-button>
			${this.renderDetail}
			${this.renderSimple}
		`;
	}
}
