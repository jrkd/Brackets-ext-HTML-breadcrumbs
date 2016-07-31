/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** Extension that adds a indicator to the status bar so a person can navigate up the html tree via parents when in html mode. */
define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager");
    var Menus          = brackets.getModule("command/Menus");
    var EditorManager  = brackets.getModule("editor/EditorManager");
    var StatusBar      = brackets.getModule("widgets/StatusBar");
    var  StringUtils          = brackets.getModule("utils/StringUtils");
    var Strings              = brackets.getModule("strings");
    var TokenUtils = brackets.getModule("utils/TokenUtils");
    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
    
    ExtensionUtils.loadStyleSheet(module, "breadcrumbs.css");
    var containerID = "status-breadcrumbs";
    var containerSelector = "#" + containerID;
    var itemClass = "breadcrumb-item";
    var itemClassSelector = "." + itemClass;
    
    StatusBar.addIndicator(containerID, Mustache.render("<div id=\""+containerID+"\" class=''></div>", ""), true, "breadcrumbs-container", "", true);
    
    EditorManager.on("activeEditorChange", _onActiveEditorChange);
    
    function _updateBreadcrumbs(event, editor){
        if(editor.document.getLanguage()._id == "html"){
            var TagInfo = function(line, ch, name, parent){
                this.line = line;
                this.ch = ch;
                this.name = name;
                this.parent = parent;
            }

            editor = editor || EditorManager.getActiveEditor();

            // compute columns, account for tab size
            var cursor = editor.getCursorPos(true);
           // alert(editor.getRootElement());
            var cursorStr = StringUtils.format(Strings.STATUSBAR_CURSOR_POSITION, cursor.line + 1, cursor.ch + 1);

            var sels = editor.getSelections(),
                selStr = "";

            var ctx = TokenUtils.getInitialContext(editor._codeMirror, editor.getCursorPos());
            $(containerSelector).empty();
            $(containerSelector).removeClass("hidden");

            var breadcrumbList = [];
            var ignoreNext = false;
            var ignoreTagName = "";
            while(!TokenUtils.isAtStart(ctx)){
                if(ctx.token.type == "tag" && ctx.pos != null){
                    //ctx.pos
                    var wholeLine = editor.document.getLine(ctx.pos.line);
                    var isClosingTag = wholeLine.charAt(ctx.token.start - 1) == "/";

                    //If the previous tag isnt closing (and the current isnt) then its a parent
                    // otherwise ignore it.

                    if( isClosingTag && !ignoreNext ){
                        ignoreNext = true;
                        ignoreTagName = ctx.token.string;
                    }
                    else{
                        //if ignore next
                        if(!ignoreNext){
                            breadcrumbList.push(new TagInfo(ctx.pos.line, ctx.pos.ch, ctx.token.string ));
                        }
                        else {
                            if(ignoreTagName === ctx.token.string){
                                ignoreNext = false; //we've just used up the ignore.                            
                            }
                        }
                    }
                }
                TokenUtils.movePrevToken(ctx);
            }

            breadcrumbList = breadcrumbList.reverse();
            for(var index = 0; index < breadcrumbList.length; ++index){
                var item = breadcrumbList[index];
                var classes = itemClass;
                if( index == breadcrumbList.length - 1 ){
                    classes += " current";
                }
                $(containerSelector).append("<div class='"+classes+"' data-line='"+item.line+"' data-col='"+item.ch+"'>" + item.name + "</div>");
            }

            $(containerSelector + " " + itemClassSelector).click(_moveCursorToTag);
        }
        else {
            $(containerSelector).empty();
        }
    }
    
        
    function _moveCursorToTag(event){
        var line = parseInt(event.toElement.dataset.line);
        var col = parseInt(event.toElement.dataset.col);
        
        EditorManager.getActiveEditor().setCursorPos(line, col);
    }
    
    function _onActiveEditorChange(event, current, previous) {
        if (current) {
            current.on("cursorActivity.statusbar", _updateBreadcrumbs);
        }
    }
});