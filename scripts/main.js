Ext.Loader.setConfig({
    enabled: true,
    disableCaching: false,
    paths: {
        GeoExt: "geoext2-2.0.2/src/GeoExt",
        Ext: "ext-4.2.1.883/src"
    }
});
var nodes = [];

var databaseUrl = "http://swgis01-ontw/geoserver/wms";
var databaseUrlWfs = "http://swgis01-ontw/geoserver/wfs";

//Panels
var searchPanel;
var mapPanel;
var legendAndLayerPanel;
var layerView;
var legendView;
var toolBar;

//Stores
var metadataStore;
var treeLayerStore;
var mapGroupStore;

//Controllers
var mapController;

var openLayersMap;

var typeKaart = 2;
var typeKaartlaag = 1;

Ext.require([
    'Ext.container.Viewport',
    'Ext.layout.container.Border',
    'GeoExt.tree.Panel',
    'Ext.tree.plugin.TreeViewDragDrop',
    'GeoExt.panel.Map',
    'GeoExt.tree.OverlayLayerContainer',
    'GeoExt.tree.BaseLayerContainer',
    'GeoExt.data.LayerTreeModel',
    'GeoExt.tree.View',
    'GeoExt.tree.Column',
	'Ext.data.TreeStore',
	'GeoExt.form.Panel',
	'Ext.tab.Panel',
	'Ext.data.Model',
	'Ext.form.field.ComboBox',
	'Ext.app.Controller',
	'Ext.layout.container.Absolute',
	'GeoExt.form.field.GeocoderComboBox',
	'GeoExt.Action',
	'GeoExt.state.PermalinkProvider',
	'GeoExt.panel.Legend',
	'GeoExt.data.LayerStore',
	'GeoExt.container.WmsLegend'
]);

Ext.define('MetadataLayerModel', {
	extend: 'Ext.data.Model',
	fields: [
		{name: 'DataCode',    type: 'int',    mapping: 'DATACODE'},
		{name: 'Titel',       type: 'string', mapping: 'DATASET_TITLE'},
		{name: 'Naam',        type: 'string', mapping: 'NAAM'},
		{name: 'Alt_titel',   type: 'string', mapping: 'ALT_TITEL'},
		{name: 'Thema',       type: 'string', mapping: 'THEMA'},
		{name: 'Info',        type: 'string', mapping: 'AANVUL_INFO'}
	]
});
		
Ext.define('ThemeModel', {
	extend: 'Ext.data.Model',
	fields: [
		{name: 'groupName', type: 'string',	mapping: 'GROEPNAAM'},
		{name: 'groupCode', type: 'int',	mapping: 'GROEPCODE'}
	]
});
		
Ext.define('MapGroupModel', {
	extend: 'Ext.data.Model',
	fields: [
		{name: 'groupCode', type: 'int',      mapping: 'GROEPCODE'},
		{name: 'layerCode', type: 'int',      mapping: 'LAAGCODE'},
		{name: 'layerTypeCode', type: 'int',  mapping: 'LAAGTYPECODE'},
		{name: 'indexNumber', type: 'int',    mapping: 'VOLGNUMMER'},
		{name: 'groupName', type: 'string',   mapping: 'GROEPNAAM'}
	]
});
		
Ext.application({
    name: 'GeoPortaal',

    launch: function () {
        models: ['ThemeModel', 'MetadataLayerModel', 'MapGroupModel'];
		
		themeStore = Ext.create('Ext.data.Store', {
			model: 'ThemeModel',
			//autoLoad: true,

			proxy: {
				type: 'ajax',
				url: 'database.php?task=SEARCHTHEME',
				reader: {
					type: 'json',
					root: 'results',
				}
			}
		});
		
		metadataStore = Ext.create('Ext.data.Store', {
			model: 'MetadataLayerModel',
			autoLoad: true,
			pageSize: 5,
			proxy: {
				type: 'ajax',
				url: 'database.php?task=SEARCH',
				reader: {
					type: 'json',
					root: 'results',
				}
			}
		});
		
		mapGroupStore = Ext.create('Ext.data.Store', {
			model: 'MapGroupModel',
			autoLoad: true,

			proxy: {
				type: 'ajax',
				url: 'database.php?task=SEARCH',
				reader: {
					type: 'json',
					root: 'results',
				}
			}
		});
		
				
		// create permalink provider
		var permalinkProvider = Ext.create('GeoExt.state.PermalinkProvider', {});
		// set it in the state manager
		Ext.state.Manager.setProvider(permalinkProvider);
		// create a map panel, and make it stateful
		
		zoomBoxAction = Ext.create('GeoExt.Action', {
			text: 'Zoom Box',
			control: new OpenLayers.Control.ZoomBox({alwaysZoom:true}),
			//group: 'navigation'
		});
	
		zoomMaxExtentAction = Ext.create('GeoExt.Action', {
			text: 'Zoom Box',
			control: new OpenLayers.Control.ZoomToMaxExtent({alwaysZoom:true}),
			map: mapPanel	
			//group: 'navigation'
		});
		
		/**
		* --------------------------------------------------------------------------------
		* MAP PANEL
		* --------------------------------------------------------------------------------
		*/
		
		
		//Set projections that will be used. Uses proj4.js that is placed in OpenLayers/lib
		var epsg28992 = new OpenLayers.Projection('EPSG:28992');
		var projOSM = new OpenLayers.Projection("EPSG:900913");
		
		//The base layer of this application. 
		var baseLayer = new OpenLayers.Layer.OSM("OpenStreetMap WMS");
		openLayersMap = new OpenLayers.Map("Map", {
				allOverlays: false, 
				projection: projOSM, 
				displayProjection: epsg28992,
				controls: [ new OpenLayers.Control.Navigation() ]
			}
		);
		
		/**
		* DEFINING ACTIONS
		*/
		var toolbarItems = [];
		
		var geocoderField = Ext.create('GeoExt.form.field.GeocoderComboBox', {
            layer: baseLayer,
            width: 200
		});
		
		var navigationAction = Ext.create('GeoExt.Action', {
			control: new OpenLayers.Control.Navigation(),
			map: openLayersMap,
			toggleGroup: "tools", 
			group: "tools",
			checked: true
		});
		
		var zoomBoxAction = Ext.create('GeoExt.Action', {
			text: 'Zoom Box',
			control: new OpenLayers.Control.ZoomBox({alwaysZoom:true}),
			map: openLayersMap,
			toggleGroup: "tools", 
			group: "tools" 
		});
		toolbarItems.push(Ext.create('Ext.button.Button', zoomBoxAction));
		
		var zoomMaxExtentAction = Ext.create('GeoExt.Action', {
			text: 'Zoom to Extent',
			control: new OpenLayers.Control.ZoomToMaxExtent({alwaysZoom:true}),
			map: openLayersMap, 
			activateOnEnable: true,
		});
		toolbarItems.push(Ext.create('Ext.button.Button', zoomMaxExtentAction));
		
		var zoomInAction = Ext.create('GeoExt.Action', {
			text: 'Zoom in',
			control: new OpenLayers.Control.ZoomIn(),
			map: openLayersMap,
		});
		toolbarItems.push(Ext.create('Ext.button.Button', zoomInAction));
		
		var zoomOutAction = Ext.create('GeoExt.Action', {
			text: 'Zoom out',
			control: new OpenLayers.Control.ZoomOut(),
			map: openLayersMap,
		});
		toolbarItems.push(Ext.create('Ext.button.Button', zoomOutAction));
		
		var measureAction = Ext.create('GeoExt.Action', {
			text: 'Meten',
			control: new OpenLayers.Control.Measure(OpenLayers.Handler.Path),
			map: openLayersMap,
			toggleGroup: "tools", 
			group: "tools" 
		});
		toolbarItems.push(Ext.create('Ext.button.Button', measureAction));
		
		var measurePolygonAction = Ext.create('GeoExt.Action', {
			text: 'Meten Vlakte',
			control: new OpenLayers.Control.Measure(OpenLayers.Handler.Polygon),
			map: openLayersMap,
			toggleGroup: "tools", 
			group: "tools" 
		});
		toolbarItems.push(Ext.create('Ext.button.Button', measurePolygonAction));
		
		var indentifyControl = new OpenLayers.Control.WMSGetFeatureInfo({
			//url: databaseUrlWfs,
			//layers: openLayersMap.layers,
			drilldown: true,
			infoFormat: 'text/html'
			//autoActivate: true,	
			//output:'features',
			//maxFeatures: openLayersMap.layers.length,
			// events: [
				// {getfeatureinfo: function () {console.log('blah');}}
			// ]
			// events: {
				// 'getfeatureinfo': function(e){
					// console.log('cblicec');
					// var items = [];
					// Ext.each(e.features, function(feature) {
						// items.push({
							// xtype: "propertygrid",
							// title: feature.fid,
							// source: feature.attributes
						// });
					// });
					// new GeoExt.Popup({
						// title: "Feature Info",
						// width: 200,
						// height: 200,
						// layout: "accordion",
						// map: mapPanel,
						// location: e.xy,
						// items: items
					// }).show();
				// }
			// }
		});	
		
		indentifyControl.events.register('getfeatureinfo', openLayersMap, function(e){
					console.log(e);
					
					// if(e.features.length === 0) {
						// return;
					// }

					// var items = [];
					// Ext.each(e.features, function(feature) {
						// items.push({
							// xtype: "propertygrid",
							// title: feature.fid,
							// source: feature.attributes
						// });
					// });
					
					Ext.create('GeoExt.window.Popup', {
						title: "Feature Info",
						width: 200,
						height: 200,
						map: openLayersMap,
						location: e.xy,
						html: e.text
					}).show();
					
					// new GeoExt.Popup({
						// title: "Feature Info",
						// width: 200,
						// height: 200,
						// layout: "accordion",
						// map: mapPanel,
						// location: e.xy,
						// html: e.text
					// }).show();
				});
		
		console.log(indentifyControl);
		
		var indentifyAction = Ext.create('GeoExt.Action', {
			text: 'i',
			control: indentifyControl,
			toggleGroup: "tools", 
			group: "tools",
			map: openLayersMap
			//listeners: {'click': function(){console.log('cblicec');}}
		});
		toolbarItems.push(Ext.create('Ext.button.Button', indentifyAction));
		
		console.log(measureAction);
		
		/**
		* 
		*/	
		mapPanel = Ext.create('GeoExt.panel.Map', {
			border: true,
			region: "center",
			map: openLayersMap,
			center: new OpenLayers.LonLat(726158.41790807,6964383.3937296),
			zoom: 10,
			stateful: true,
			stateId: "map",
			prettyStateKeys: true,
			layers: [
				baseLayer,
				new OpenLayers.Layer.WMS("Border",
					databaseUrl, {
						layers: "geo:EXT.TDN_HIST_PROVGRENS_V",
						format: "image/svg+xml",
						transparent: true
					}, {
						//buffer: 0,
						visibility: true,
						isBaseLayer: false,
						displayInLayerSwitcher: true
					}
				)
			],
			
			dockedItems: [geocoderField,{
                xtype: 'toolbar',
                dock: 'top',
                items: toolbarItems
            }],
			
			/**
			* Voegt een enkele laag toe aan de huige kaart.
			*	
			* @param {string}  layerName 	 De titel van de kaart zoals deze in een lijst hoort te staan.
			* @param {string}  layerAltName  De titel van de kaart zodat deze met een WMS request gemaakt kan worden.
			* @param {boolean} layerSwitcher Kaart weergeven in de lijst met lagen of niet. 
			*   							 False wordt voornamelijk gebruikt voor kaarten die anders in de boom worden weergeven.
			*/
			addLayer: function(layerName, layerAltName, layerSwitcher) {
				//Als het om een kaartlaag gaat is het simpel: 
				//Voeg de laag toe.
				var olLayer;
				olLayer = new OpenLayers.Layer.WMS(layerName,
					"http://swgis01-ontw/geoserver/wms", {
						layers: layerAltName,
						format: "image/png",
						transparent: true
					}, {
						buffer: 0,
						visibility: true,
						isBaseLayer: false,
						displayInLayerSwitcher: layerSwitcher
						//singleTile: true
					}
				);

				this.map.addLayer(olLayer);
				return olLayer;
			},

			addLayersOfThemeToStore: function(themeName, themeCode) {
				metadataStore.loadData([], false);
				mapGroupStore.loadData([], false);
				
				mapGroupStore.load({
					params: {'SEARCHMAPGROUP': themeCode},
					callback: function () {mapPanel.fillFirstThemeStore(themeName, themeCode);}
				});				
			},
			
			fillFirstThemeStore: function(upperThemeName, upperThemeCode){
				//Store should be loaded now				
				var codes = [];
				var once = false;
							
				mapGroupStore.each(function(record) {
					if(!once){
						codes.push([upperThemeCode, upperThemeName]);
						once = true;
					}
					if(record.get('layerTypeCode') == typeKaart){
						codes.push([record.get('layerCode'), record.get('groupName')]);
					}
				});

				if(codes.length > 0){	
					this.fillStoreWithThemes(upperThemeName, codes, 0);
				} else {
					this.getLayersFromThemes([[upperThemeCode, upperThemeName]]);
				}
			},
			
			fillStoreWithThemes: function(upperThemeName,themeCodes, index) {
				if(index > 0){
					themeCodes.push(record.get('layerCode'));
				}

				if(index + 1 == themeCodes.length) {
					mapGroupStore.load({
						params: {'SEARCHMAPGROUP': themeCodes[index][0]},
						callback: function () {mapPanel.fillStoreWithThemes(upperThemeName, themeCodes[index], index++);}				
					});
				} else {
					this.getLayersFromThemes(themeCodes);
				}
			},
				
			getLayersFromThemes: function(codes){
				var onlyCodes = [];
				var i;
				for(i = 0; i < codes.length; i++){
					onlyCodes.push(codes[i][0]);
				}
				
				console.log(codes);
				
				mapGroupStore.load({
					params: {'SEARCHLAYERFORGROUP': onlyCodes.join("\\")}
				});
				
				metadataStore.load({
					params: {'SEARCHALL': onlyCodes.join("\\")},
					callback: function () { mapPanel.createTree(codes) }
				});
			},
			
			createTree: function(codes) {
				var upperThemeCode = codes[0][0];
				var upperThemeName = codes[0][1];
				var upperThemeChildren = [];
				
				var secondThemes = [];
				var secondThemeNodes = [];
				

				var i;
				for(i = 1; i < codes.length; i++){
					secondThemeNodes.push(
							mapPanel.creatThemeNode(codes[i][1], codes[i][0])
					);
				}
				
				upperThemeChildren = this.createLeafNodes(upperThemeCode);
				
				var allChildren = upperThemeChildren.concat(secondThemeNodes);
			
				var upperThemeNode = new GeoExt.tree.LayerNode({
					text: upperThemeName, 
					children: allChildren,
				});
				
				treeLayerStore.getRootNode().appendChild(upperThemeNode);	

				//TESTCODE LEGENDS
				// var layers;
				// for(var i = 1; i < openLayersMap.layers; i++) 
				// { 
			// } 
			},
			
			creatThemeNode: function(name, code) {
				
				var themeNode = [];		
				var layerNodes = [];
						
				layerNodes = this.createLeafNodes(code);
				
				// Maakt een thema node aan voor het later toevoegen aan het lagenmodel.
				themeNode = new GeoExt.tree.LayerNode({
					text: name, 
					checked: true,
					children: layerNodes,
				})
				
				return themeNode;
			},
			
			createLeafNodes: function(groupCode) {
				var themeLayers = [];	
				var layerNodes = [];
				mapGroupStore.each(function(record){
					if(record.get('groupCode') == groupCode){
						var dataRecord = metadataStore.findRecord('DataCode', record.get('layerCode'));
						themeLayers.push([dataRecord.get('Alt_titel'), dataRecord.get('Naam')]);
					}
				});
				
				for(i = 0; i < themeLayers.length; i++) {				
					// Voeg de node toe aan de array zodat het later onder de juiste
					// folder geplaatst kan worden.
					layerNodes.push(this.createLeafNode(themeLayers[i][1], themeLayers[i][0]));
				}	
				
				return layerNodes;
			},
			
			createLeafNode: function (layerName, layerTitle) {
				var olLayer;
				var node;
					
				// Maakt een kaartlaag aan
				olLayer = mapPanel.addLayer(layerName, layerTitle, false);
				
				// Maakt een treenode aan voor laagmodel
				node = ({
					plugins: ['gx_layer'],
					text: layerName,
					layerStore: mapPanel.layers,
					layer: olLayer,
					isLeaf: true,
					leaf: true,
				});
				
				// Voeg de node toe aan de array zodat het later onder de juiste
				// folder geplaatst kan worden.
				return node;
				//layerNodes.push(node);
			}			
		});	
		
		/**
		* --------------------------------------------------------------------------------
		* SEARCH MAP PANEL
		* --------------------------------------------------------------------------------
		*/
		
		/*
		* Type: 0 = Kaart
		* Type: 1 = Kaartlaag
		* Type: 99 = niks
		*/
		var comboBoxStore = Ext.create('Ext.data.Store', { 
			fields: ['name', 'type', 'altTitel'],
			listeners: {
				dataChanged: {
					fn: function(object, opts) {
						console.log('dataChanged', object, opts);
					}
				}
			}
		});
		
		var searchBar = Ext.create('Ext.form.field.Text', {
			fieldLabel: 'zoeken',
			labelAlign: 'top',
			listeners: {
				change: function(){
					if(searchBar.getValue().length >= 2){
						searchBar.storeThemeData(searchBar.getValue());
					}					
				}
			},
			
			storeThemeData: function(param) {
				themeStore.load({
					params: {'SEARCHTHEMEQUERY': param},
					callback: function () {searchBar.storeMetaData(param)}
				});	
			},
			
			storeMetaData: function(param) {
				metadataStore.load({
					params: {'SEARCHQUERY': param}
				});	
			}
		});
		
		var comboBox = Ext.create('Ext.form.field.ComboBox', {
			xtype: 'combobox',
			id: 'searchbar',
			name : 'name',
			valueField: 'name',
			queryMode: 'local',
			displayField: 'name',
			store: comboBoxStore,
			queryDelay: 1000,
			//queryParam: 'SEARCHQUERY',
			autoSelect: false,
			typeAhead:true,
			labelAlign: 'top',
			fieldLabel: 'zoeken',
			width: 190,
			minChars: 2, 
			forceSelection: false,
			hideTrigger: true,			
			listeners: {
				// 'select': {
					// fn: function(combo, records, eOpts) {
						// var selected = records[0].get('type');	
						// if(selected == typeKaartlaag){
							// console.log('selected record', records);
							// mapPanel.addLayer(records[0].get('name'), records[0].get('altTitel'), true);
						// }
						// else if(selected == typeKaart){
							// mapPanel.addLayersOfThemeToStore(records[0].get('name'), records[0].get('altTitel'));
						// }
					// }
				// },
				beforeQuery: function(plan) {
					console.log("before query");
					//comboBoxStore.loadData([], false);
					this.storeThemeData(plan.query);	
					// themeStore.load({
						// params: {'SEARCHTHEMEQUERY': plan.query}
					// });	
					
					// metadataStore.load({
						// params: {'SEARCHQUERY': plan.query}
					// });
					
					// themeStore.each(function(record) { 
						// comboBoxStore.add({name: record.get('groupName'), type: typeKaart,altTitel: record.get('groupCode')});		
					// });
				
					// if(metadataStore.count() > 0 && themeStore.count() > 0) {
						// comboBoxStore.add({name: '------', type: '99'});
					// }
					
					// metadataStore.each(function(record) { 
						// comboBoxStore.add({name: record.get('Naam'), type: typeKaartlaag, altTitel: record.get('Alt_titel')});
					// });		
									
				}
			},
			
			storeThemeData: function(param) {
				//console.log("store theme");
				themeStore.load({
					params: {'SEARCHTHEMEQUERY': param},
					callback: function () {comboBox.storeMetaData(param)}
				});	
			},
			
			storeMetaData: function(param) {
				//console.log("store metadata");
				metadataStore.load({
					params: {'SEARCHQUERY': param},
					callback: function () {comboBox.loadDataInCombo()}
				});	
			},
			
			loadDataInCombo: function() { 
				//console.log("load data",themeStore ,metadataStore);
				themeStore.each(function(record) { 
					comboBoxStore.add({name: record.get('groupName'), type: typeKaart,altTitel: record.get('groupCode')});		
				});
			
				if(metadataStore.count() > 0 && themeStore.count() > 0) {
					comboBoxStore.add({name: '------', type: '99'});
				}
				
				metadataStore.each(function(record) { 
					comboBoxStore.add({name: record.get('Naam'), type: typeKaartlaag, altTitel: record.get('Alt_titel')});
				});	
				console.log('combobox', comboBoxStore);
			}
		});
			
		var mapGrid	= Ext.create('Ext.grid.Panel', {
			y: 50,
			store: themeStore,
			columns: [ {
				text: 'Kaarten',
				dataIndex: 'groupName',
				columnWidth: '200'
			}],
			listeners: {
				cellClick: function(source, td, cellIndex, record, tr, rowIndex, e, eOpts) {
					mapPanel.addLayersOfThemeToStore(record.get('groupName'), record.get('groupCode'));
				}
			}
		});
		
		var page = 0;
		var layerGrid	= Ext.create('Ext.grid.Panel', {
			y: 150,
			store: metadataStore,
			columns: [{	
					text: 'Kaartlagen',
					//dataIndex: 'Naam',
					xtype: 'templatecolumn',
					tpl: '<div class="custom-layer-grid x-grid-cell-inner" style="{white-space: normal}"><b>{Naam}</b></div>' +
						'<div class="custom-layer-grid x-grid-cell-inner"><i>{Info}</i></div>',
					width: 300
				}
			],
			listeners: {
				cellClick: function(source, td, cellIndex, record, tr, rowIndex, e, eOpts) {
					mapPanel.addLayer(record.get('Naam'), record.get('Alt_titel'));
				}
			},
			
			// bbar: [{
				// xtype: 'pagingtoolbar',
				// store: metadataStore,
				// hideRefresh: true,
				// alternateHandlers: {
				
				// }
			// }]
			
			// bbar: [{
				// xtype: 'button',
				// text: 'vorige',
				// handler: function () {
					// console.log(metadataStore.getRange());
				// }
			// },{
				// xtype: 'button',
				// text: 'volgende',
				// handler: function () {
					// console.log('click');
					// metadataStore.nextPage();
				// }
			// },{
				// xtype: 'label',
				// text: 'lagen:' + metadataStore.count()
			// }]
			
			
			bbar: Ext.create('Ext.PagingToolbar', {
				store: metadataStore,
				displayInfo: true,
				displayMsg: 'Lagen {0} - {1} of {2}',
				emptyMsg: "Geen lagen gevonden",
			}),
			
		});
			
		searchPanel = Ext.create('GeoExt.form.Panel', {
			// layout: 'table',	
			// columns: 1,
			// rows: 3,
			layout: 'absolute',
			region: 'west',
			width: 300,
			border: false,
			collapsible: true,
			items: [searchBar, mapGrid, layerGrid],
			
							// xtype: 'button',
							// id: 'searchButton',
							// text: 'zoeken'
						// }
					// ]
				// }];
				// me.callParent(arguments);
			//}
		});

		/**
		* --------------------------------------------------------------------------------
		* TREE PANELS
		* --------------------------------------------------------------------------------
		*/
		
		treeLayerStore = Ext.create('Ext.data.TreeStore', {
			model: 'GeoExt.data.LayerTreeModel',
			
			root: {
				expanded: true,
				children: [{
					plugins: [{
						ptype: 'gx_layercontainer',
						store: mapPanel.layers
					}],
					expanded: true
				}]
			}
		});
		
		legendLayerStore = Ext.create('Ext.data.TreeStore', {
            model: 'GeoExt.data.LayerTreeModel',
            root: {
				expanded: true,
                plugins: [{
                    ptype: "gx_layercontainer",
                    loader: {
                        createNode: function(attr) {   
                            attr.component = {
                                xtype: "gx_wmslegend",
                                layerRecord: mapPanel.layers.getByLayer(attr.layer),
                                showTitle: false,
                                cls: "legend",
								listeners: {
									'click': function () {console.log('blah'); }
								}
                            };
                            return GeoExt.tree.LayerLoader.prototype.createNode.call(this, attr);	
                        }
                    }
                }]
            }
        });
			
		// legendLayerStore = Ext.create('GeoExt.data.LayerStore', {
			// map: openLayersMap,
			// initDir: 'MAP_TO_STORE',
			// layers: openLayersMap.layers
		// });
		
		// legendView = Ext.create('GeoExt.LegendPanel',{
			// layerStore: legendLayerStore,
			// title: "Legend",
			// autoScroll: true,
			// defaults: {
				// style: 'padding:5px',
				// baseParams: {
					// FORMAT: 'image/png',
					// LEGEND_OPTIONS: 'forceLabels:on'
				// }
			// },
		// });
		
		// legendView = Ext.create('GeoExt.tree.Panel', {
			// title: 'legenda',
			// viewConfig: {
                // plugins: [{
                    // ptype: 'treeviewdragdrop',
                    // appendOnly: false
                // }]
            // },
			// store: legendLayerStore,
			// lines: false
		// });
		
		// legendView = Ext.create('GeoExt.LegendPanel',{
			// map: mapPanel,
			// title: 'Legenda',
			// defaults: {
				// style: 'padding:5px',
				// baseParams: {
					// FORMAT: 'image/png',
					// LEGEND_OPTIONS: 'forceLabels:on'
				// }
			// },
			
			// onRender: function () {
				// legendView.superclass.onRender.apply(this, arguments) ;
			// },
			
			// filter: function(record) {
				// return record.getLayer().isBaseLayer;
			// }
		// });
		
		// legendLayerStore = Ext.create('Ext.data.TreeStore', {
			// model: 'GeoExt.data.LayerTreeModel',
			// root: {
				// plugins: [{
					// ptype: "gx_layercontainer",
					// loader: {
						// createNode: function(attr) {
							// attr.component = {
								// xtype: "gx_wmslegend",
								// layerRecord: mapPanel.layers.getByLayer(
												  // attr.layer),
								// showTitle: false,
								// cls: "legend"
							// };
							// return GeoExt.tree.LayerLoader.prototype.createNode.call
									  // (this, attr);
						// }
					// }
				// }]
			// }
		// });
		
		// legendView  = new GeoExt.LegendPanel({
			// title: "Map Legend",
			// iconCls: 'legend',
                // autoScroll: true,
                // defaults: {
                    // cls: 'legend-item',
					// baseParams: {FORMAT: 'image/png'}
                // },
                // items: []
            // }),
		
		// legendView  = Ext.create('GeoExt.LegendPanel', {
			// id:'extjs_gui_legend_panel_list',
			// map: openLayersMap,
			// layout: 'table',

			// filter: function(record){
					// if( !(record.getLayer().isBaseLayer) && !(record.getLayer() instanceof OpenLayers.Layer.Vector) ){
							// return true;
					// }
			// },

			// defaults: {
					// showTitle: false,
					// baseParams: {
							// format: 'image/png',
					// }
					// ,style: '{border-style: ridge;}'
			// }
        // });	
		
		// legendView = new GeoExt.LegendPanel({
			// map: mapPanel.map,
			// title: 'Legend Panel',
			// defaults: {
				// style: 'padding:5px',
				// baseParams: {
					// FORMAT: 'image/png',
					// LEGEND_OPTIONS: 'forceLabels:on'
				// }
			// }
		// }),
		
		legendView = Ext.create('GeoExt.tree.Panel', {
			title: 'legenda',
			store: legendLayerStore,
			rootVisible: false,
			viewConfig: {
                plugins: [{
                    ptype: 'treeviewdragdrop',
                    appendOnly: false
                }]
            }
		});
		
		layerView = Ext.create('GeoExt.tree.Panel', {
			title: 'lagen',
			store: treeLayerStore,
			// viewConfig: {
                // plugins: [{
                    // ptype: 'treeviewdragdrop',
                    // appendOnly: false
                // }]
            // },
			rootVisible: false,
		});
		
		legendAndLayerPanel = Ext.create('Ext.tab.Panel',{	
			region: 'east',
			border: false,
			width: 200,
			
			items: [layerView, legendView]
		});
		
		/**
		* --------------------------------------------------------------------------------
		* VIEWPORT
		* --------------------------------------------------------------------------------
		*/
		
		Ext.create('Ext.Viewport', {
            layout: "fit",
            hideBorders: true,
            items: {
                layout: "border",
				regionWeights: {
					west: 20,
					north: 5,
					south: 10,
					east: 20
				},
                //deferredRender: false,
                items: [
					mapPanel, 
					searchPanel, 
					legendAndLayerPanel
					//toolBar
				]			
            }
        });
		
		/**
		* --------------------------------------------------------------------------------
		* PERMALINK - Only does location now.
		* --------------------------------------------------------------------------------
		*/

		var onStatechange = function(provider) {
            var l = provider.getLink();
			console.log(l);
        };
		
        permalinkProvider.on({
            statechange: onStatechange
        });
		
		var onMouseMove = function(e) {
				//var lonLat = mapPanel.getLonLatFromPixel(e.xy);

				// if (mapPanel.displayProjection) {
						// lonLat.transform(mapPanel.getProjectionObject(),
										// mapPanel.displayProjection);
				// }

				//Ext.getCmp("x-coord").setText("X: " + lonLat.lon.toFixed(GeoViewer.Map.options.XY_PRECISION));
				//Ext.getCmp("y-coord").setText("Y: " + lonLat.lat.toFixed(GeoViewer.Map.options.XY_PRECISION));
		};
		
		var onMeasurements = function (event) {
				var units = event.units;
				var measure = event.measure;
				var out = "";
				if (event.order == 1) {
						console.log(": " + measure.toFixed(3) + " " + units);
				} else {
						console.log(": " + measure.toFixed(3) + " " + units + "2");
				}
				//Ext.getCmp("bbar_measure").setText(out);
		};
		
		openLayersMap.events.register("mousemove", openLayersMap, onMouseMove);

		var controls = openLayersMap.getControlsByClass("OpenLayers.Control.Measure");
		for (var i = 0; i < controls.length; i++) {
				controls[i].events.register("measure", openLayersMap, onMeasurements);
				controls[i].events.register("measurepartial", openLayersMap, onMeasurements);
		};
	}
});
	
