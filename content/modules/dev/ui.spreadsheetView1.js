/* spreadsheetView Plugin 
 * Depends:
 *	ui.core.js
 * 	ui.view.js
 *

 Author 
 Sacha Zyto (sacha@csail.mit.edu) 

 License
 Copyright (c) 2010 Massachusetts Institute of Technology.
 MIT License (cf. MIT-LICENSE.txt or http://www.opensource.org/licenses/mit-license.php)
*/

(function($) {
    var V_OBJ = $.extend({},$.ui.view.prototype,{
	    _create: function() {
		$.ui.view.prototype._create.call(this);
		var self = this;
		self.element.addClass("spreadsheetView").html("<div class='spreadsheetView-header'/><div class='spreadsheetView-contents'/>");
		self._selection = [1,1]; //[row, column]
		self._files = null;
		self._users = null;
	    },
	    _recenterMaybe: function(sel){
		var self = this;
		var scrollby;
		var container = self.element;
		//vertical scrolling: 
		var h = sel.height()
		var H = container.height();
		var delta_top = sel.offset().top - container.offset().top;
		var delta_bottom = delta_top + h - H;
		if (delta_top > 0){ 
		    if (delta_bottom > 0) {//but selection is too low... scroll down
			scrollby = delta_bottom + H/2-h; //delta_bottom is how much to scroll so that bottom of lens coincides with bottom of widget. 
			container.stop(true).animate({scrollTop: '+=' + scrollby  + 'px'}, 300); 	
		    }
		}
		else{ //too high: recenter: 
		    scrollby = delta_top + (h-H)/2;
		    container.stop(true).animate({scrollTop: '+=' + scrollby + 'px'}, 300); 	
		}
		//horizontal scrolling: 
		var w = sel.width()
		var W = container.width();
		var delta_left = sel.offset().left - container.offset().left;
		var delta_right = delta_left + w - W;
		if (delta_left > 0){ 
		    if (delta_right > 0) {//but selection is too much to the right: scroll to the right
			scrollby = delta_right + W/2-w; //delta_right is how much to scroll so that right of lens coincides with right of widget. 
			container.stop(true).animate({scrollLeft: '+=' + scrollby  + 'px'}, 300); 	
		    }
		}
		else{ //selection too high: recenter: 
		    scrollby = delta_left + (w-W)/2;
		    container.stop(true).animate({scrollLeft: '+=' + scrollby + 'px'}, 300); 	
		}
		
	    }, 
	    _defaultHandler: function(evt){
		var self	= this;
		var m		= self._model;
		var sel;
		switch (evt.type){
		case "selection": 
		    $("td.selected", self.element).removeClass("selected");
		    self._selection = evt.value.sel;
		    sel = $("tr:eq("+self._selection[0]+")",self.element).children("td:eq("+self._selection[1]+")").addClass("selected");
		    self._recenterMaybe(sel);

		    break;
		}
	    },
	    update: function(action, payload, items_fieldname){
		if (action == "add" && items_fieldname=="grade"){
		    $.D("TODO re_render");
		}
	    },
	    set_model: function(model, init_event){
		var self=this;
		model.register($.ui.view.prototype.get_adapter.call(this),  {});
		//build view: 
		self._model =  model;
		self._generate_contents();
	    },
	    _update: function(){
		$.ui.view.prototype._update.call(this);
		var self = this;
	    },	   
	    close: function(){
		var id =  this._id_collection;
		delete $.concierge.features["doc_viewer"][id];
		$.ui.view.prototype.close.call(this);
		$.D("closing spreadsheetviewer",  id);
	    },
	    _generate_contents: function(){
		this._render();
	    }, 
	    _keydown: function(event){
		var self = this;
		var sel_codes = {  
		    37: {dir: -1, idx: 1, extremum:1 , msg:"At beginning of list..."},
		    39: {dir: 1,  idx: 1, extremum:self._files.length , msg:"At end of list..."},  
		    38: {dir: -1, idx: 0, extremum: 1, msg: "Already at the top..."}, 
		    40: {dir: 1, idx: 0, extremum: self._users.length, msg: "Already at the bottom..."}}; 
		var grade_codes = {97: 4, 98:3, 99:2, 100:1, 102:0}; //US GPA system. 
		var new_sel, v;
		if (event.keyCode in sel_codes){		    
		    v = sel_codes[ event.keyCode];
		    new_sel =  self._selection[v.idx] + v.dir;		    
		    if (v.dir*(new_sel-v.extremum) > 0){
			$.I( v.msg);
		    }
		    else{
			var _sel = self._selection.slice();
			_sel[v.idx] = new_sel;
			$.concierge.trigger({type:"selection", value: {sel: _sel, users: self._users, files: self._files}});
		    }  
		    return false;
		}
		else if (event.keyCode == 0 && event.charCode in grade_codes){
		    var id_user = self._users[self._selection[0]-1].id;
		    var id_source =  self._files[self._selection[1]-1].id;
		    $.concierge.get_component("set_grade_assignment")({grade: grade_codes[event.charCode], id_user: id_user, id_source: id_source}, function(P){			    
			    self._model.add("grade", P.grades)
			    $.I("grade added");
			    self._render()
			});
		}
		else{
		    return true; // let the event be captured for other stuff
		}
	    }, 
	    _lens: function(i_user, i_file){
		var self	= this;
		var m		= self._model;
		var file	= self._files[i_file];
		var user	= self._users[i_user];
		var stat	= m.o.stat[user.id+"_"+file.id];
		var grade	= m.get("grade", {id_user: user.id, id_source:file.id}).first();
		var lens_stat	= (stat != undefined) ? "<span class='stat'>"+stat.cnt+"</span>" : "";
		var lens_grade	= (grade != null) ?  "<span class='grade'>"+$.concierge.get_component("grade2litt")(grade.grade)+"</span>": "";
		return lens_stat+" "+lens_grade;		
	    }, 
	    _render: function(){
		var self	= this;
		var m		= self._model;
		var f_sort_user = function(o1, o2){
		    if (o1.lastname == null){
			return  o2.lastname == null ? 0 : 1;
		    }
		    if (o1.lastname > o2.lastname){
			return 1;
		    }
		    if (o1.lastname < o2.lastname){
			return -1;
		    }
		    return 0;
		};
		var f_sort_file = function(o1, o2){
		    return o1.id - o2.id;
		}
		self._users = m.get("user", {admin: false, guest: false}).sort(f_sort_user);
		self._files = m.get("file", {}).sort(f_sort_file);
		var i,j,file, user, stat, lens,grade, lens_stat, lens_grade;
		var s = ["<table class='spreadsheet'><thead><tr><th/>"];
		for (i in self._files){
		    file = self._files[i];
		    s.push("<th><a class='vertical' title='"+$.E(file.title)+"' target='_blank' href='/f/"+file.id+"'>"+$.E($.ellipsis(file.title, 12))+"</a></th>");	    
		}
		s.push("</tr></thead><tbody>");
		for (j in self._users){		    
		    user = self._users[j];	
		    lens = (user.lastname != null) ? (user.firstname + " "+user.lastname) : ("<i>"+user.email+"</i>")
			s.push("<tr><td>"+lens+"</td>");
		    for (i in self._files){
			/*
			file = self._files[i];
			    stat = m.o.stat[user.id+"_"+file.id];
			    grade =  m.get("grade", {id_user: user.id, id_source:file.id}).first();
			    lens_stat = (stat != undefined) ? stat.cnt : "";
			    lens_grade = (grade != null) ? grade.grade: ""
			    s.push("<td>"+lens_stat+" "+lens_grade+"</td>");	    
			*/
			//TODO remove var declarations
			s.push("<td>"+self._lens(j,i)+"</td>")
		    }
		    s.push("</tr>");
		    
		}
		s.push("</tbody></table>");
		var contents = $("div.spreadsheetView-contents", self.element).html(s.join(""));
		var f_cell_click = function(event){
		    var td = event.currentTarget;
		    var tr = td.parentNode;
		    if (td.cellIndex > 0 && tr.rowIndex>0){
			var _sel = [tr.rowIndex, td.cellIndex];
			$.concierge.trigger({type:"selection", value: {sel: _sel, users: self._users, files: self._files}});
		    }
		}
		$("td", contents).click(f_cell_click);
		$("tr:eq("+self._selection[0]+")",contents).children("td:eq("+self._selection[1]+")").addClass("selected");
	    }
	});
    
    $.widget("ui.spreadsheetview",V_OBJ );
    $.ui.spreadsheetview.prototype.options = {
	provides: ["spreadsheet"], 
	listens: {
	    selection: null
	}		    
    };
})(jQuery);