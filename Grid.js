define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/on",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dojo/query",
	"dojox/html/metrics",
	"dijit/_WidgetBase",
	"dijit/_FocusMixin",
	"dijit/_TemplatedMixin",
	"dojo/text!./templates/Grid.html",
	"./core/Core",
	"./core/model/extensions/Query",
	"./core/_Module",
	"./modules/Header",
	"./modules/View",
	"./modules/Body",
	"./modules/VLayout",
	"./modules/HLayout",
	"./modules/VScroller",
	"./modules/HScroller",
	"./modules/ColumnWidth",
	"./modules/Focus",
	"dijit/_BidiSupport"
], function(declare, lang, has, on, domClass, domGeometry, query, metrics,
	_WidgetBase, _FocusMixin, _TemplatedMixin, template,
	Core, Query, _Module, Header, View, Body, VLayout, HLayout, VScroller, HScroller, ColumnWidth, Focus, _BidiSupport){

	var dummyFunc = function(){};

	return declare('gridx.Grid', [_WidgetBase, _TemplatedMixin, _FocusMixin, Core], {
		// summary:
		//		Gridx is a highly extensible widget providing grid/table functionalities. 
		// description:
		//		Gridx is much smaller, faster, more reasonable designed, more powerful and more flexible 
		//		compared to the old dojo DataGrid/EnhancedGrid.
		
		templateString: template,

		//textDir bidi support begin
		_setTextDirAttr: function(textDir){
			// summary:
			//		 Seamlessly changes grid 'textDir' property on the fly.
			// textDir:
			//		Grid text direction
			if(this.textDir != textDir){
				this.textDir = textDir;
				this.header.refresh();
				if(this.edit){
					this.edit._initAlwaysEdit();
				}
				this.body.refresh();
			}
		},

		getTextDir: function(colId, text){
			var col = this._columnsById[colId],
				textDir = (col && col.textDir) || this.textDir;
			return textDir = (textDir === "auto") ? _BidiSupport.prototype._checkContextual(text) : textDir;
		},

		getTextDirStyle: function(colId, text){
			var textDir = this.getTextDir(colId, text);
			return textDir ? " direction:" + textDir + ";" : "";
		},

		enforceTextDirWithUcc: function(colId, text){
			var textDir = this.getTextDir(colId, text);
			//var LRE = '\u202A', RLE = '\u202B', PDF = '\u202C';
			return textDir ? (textDir === "rtl" ? '\u202B' : '\u202A') + text + '\u202C' : text;
		},
		//textDir bidi support end

		coreModules: [
			//Put default modules here!
			Header,
			View,
			Body,
			VLayout,
			HLayout,
			VScroller,
			HScroller,
			ColumnWidth,
			Focus
		],

		coreExtensions: [
			//Put default extensions here!
			Query
		],
	
		postCreate: function(){
			// summary:
			//		Override to initialize grid modules
			// tags:
			//		protected extension
			var t = this;
			t.inherited(arguments);
			t._eventFlags = {};
			t.modules = t.coreModules.concat(t.modules || []);
			t.modelExtensions = t.coreExtensions.concat(t.modelExtensions || []);
			domClass.toggle(t.domNode, 'gridxRtl', !t.isLeftToRight());
			t.lastFocusNode.setAttribute('tabIndex', t.domNode.getAttribute('tabIndex'));
			t._initEvents(t._compNames, t._eventNames);
			t._init();
			//resize the grid when zoomed in/out.
			t.connect(metrics, 'onFontResize', function(){
				t.resize();
			});
		},
	
		startup: function(){
			// summary:
			//		Startup this grid widget
			// tags:
			//		public extension
			if(!this._started){
				this.inherited(arguments);
				this._deferStartup.callback();
			}
		},
	
		destroy: function(){
			// summary:
			//		Destroy this grid widget
			// tags:
			//		public extension
			this._uninit();
			this.inherited(arguments);
		},

	/*=====
		// autoHeight: Boolean
		//		If true, the grid's height is determined by the total height of the rows in current body view,
		//		so that there will never be vertical scroller bar. And when scrolling the mouse wheel over grid body,
		//		the whole page will be scrolled. Note if this is false, only the grid body will be scrolled.
		autoHeight: false,
		// autoWidth: Boolean
		//		If true, the grid's width is determined by the total width of the columns, so that there will
		//		never be horizontal scroller bar.
		autoWidth: false,
	=====*/

		
		resize: function(changeSize){
			// summary:
			//		Resize the grid using given width and height.
			// tags:
			//		public
			// changeSize: Object?
			//		An object like {w: ..., h: ...}.
			//		If omitted, the grid will re-layout itself in current width/height.
			var t = this, ds = {};
			if(changeSize){
				if(t.autoWidth){
					changeSize.w = undefined;
				}
				if(t.autoHeight){
					changeSize.h = undefined;
				}
				domGeometry.setMarginBox(t.domNode, changeSize);
			}
			t._onResizeBegin(changeSize, ds);
			t._onResizeEnd(changeSize, ds);
		},

		//Private-------------------------------------------------------------------------------
		_onResizeBegin: function(){},
		_onResizeEnd: function(){},

		_escapeId: function(id){
			return String(id).replace(/\\/g, "\\\\");
		},

		//event handling begin
		_compNames: ['Cell', 'HeaderCell', 'Row', 'Header'],
	
		_eventNames: [
			'Click', 'DblClick', 
			'MouseDown', 'MouseUp', 
			'MouseOver', 'MouseOut', 
			'MouseMove', 'ContextMenu',
			'KeyDown', 'KeyPress', 'KeyUp'
		],
	
		_initEvents: function(objNames, evtNames){
			var i = 0, j, comp, evt, evtName;
			while(comp = objNames[i++]){
				for(j = 0; evt = evtNames[j++];){
					evtName = 'on' + comp + evt;
					this[evtName] = this[evtName] || dummyFunc;
				}
			}
		},
	
		_connectEvents: function(node, connector, scope){
			for(var t = this,
					m = t.model,
					eventName,
					eventNames = t._eventNames,
					len = eventNames.length,
					i = 0; i < len; ++i){
				eventName = eventNames[i];
				m._cnnts.push(on(node, eventName.toLowerCase(), lang.hitch(scope, connector, eventName)));
			}
		},
	
		_isConnected: function(eventName){
			return this[eventName] !== dummyFunc;
		},
		//event handling end

		_isCopyEvent: function(evt){
			// summary:
			//		On Mac Ctrl+click also opens a context menu. So call this to check ctrlKey instead of directly call evt.ctrlKey
			//		if you need to implement some handler for Ctrl+click.
			return has('mac') ? evt.metaKey : evt.ctrlKey;
		}
	});
});
