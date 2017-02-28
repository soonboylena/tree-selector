/**
 * 弹出一个窗口进行树状结构数据选择,支持复选，单选
 * 选项(默认值)：
 url: 从后台取得数据的url (使用get方法)
 title: "选择",  // 标题
 "getResponseData": function (data) { return data; }, // 从后台取得数据后，提供一个进一步编辑的机会
 valueField: "value",    // key值字段名
 textField: "text",      // 文本字段名称
 tab1Name: "/",          // 第一个tab页名称
 subNodeField: "subNode", // 子节点的名称
 isMultiple: false,      // 是否是复选
 onlySelectLeaf: true,   // 是否只有叶子可以选择,
 separator: ","          // 多选时候用这个符号来分割
 * 事件
 * Created by sunb-c on 2016/11/3.
 */

(function ($) {

    var FpSelector = function (el, options) {

        this.options = options;
        this.$el = $(el);
        // this.$el_ = this.$el.clone();
        this.init();
    };

    FpSelector.DEFAULTS = {
        url: undefined,
        valueField: "value",
        textField: "text",
        subNodeField: "subNode",
        isMultiple: false,
        title: "选择",
        separator: ",",
        responseHandler: function (responseData) {
            return responseData;
        }

    };

    // 方法名
    // =======================
    var allowedMethods = [];

    //  初始化方法
    FpSelector.prototype.init = function () {

        this.selectedData = [];
        this.previousSelected = [];
        this.tempData = [];
        this.objectMap = {};
        this.active = undefined;
        this.isInit = false;

        var that = this;
        if (this.options.url && this.options.url !== null) {
            $.get(
                this.options.url,
                function (responseData) {
                    that.data = that.options.responseHandler(responseData);
                    that.buildDataMap(that.data);
                    that.initLayout();
                    that.initEvent();
                }
            );
        } else {
            throw new Error("请指定url");
        }
    };

    FpSelector.prototype.initLayout = function () {
        this.$el.addClass("select-target-hide");
        this.$cover = $('<span class="select-target-cover"></span>');
        this.$el.after(this.$cover);

        // 原控件如果只读或者disable，不绑定点击事件。
        if (!this.$el.prop("readonly") && !this.$el.prop("disabled")) {
            this.$cover.popover({
                "title": (this.options.title).concat(this.options.isMultiple ? " (多选)" : ""),
                "placement": "auto bottom",
                "html": true,
                trigger: "manual",
                content: this.buildHtml()
            });
        }
    };

    FpSelector.prototype.initEvent = function () {

        var that = this;

        // 如果控件的值变化的话，重新选值事件
        this.$el.on("change", function () {
            var $this = $(this);
            if ($this.val() != "") {
                var values = $this.val().split(that.options.separator);

                that.previousSelected = that.selectedData;
                that.selectedData = [];
                $.each(values, function (index, key) {
                    var obj = that.objectMap[key];
                    var objArray = that.parents(key);
                    that.$cover.append("<span class='select-cover-selected' title='" + that.obj2Text(objArray, "text") + "'>" + (that.objectMap[key] ? that.objectMap[key].text : "") + "</span>");
                    that.selectedData.push(obj);
                    that.tempData.push(obj);
                });
            }
        });

        // 原控件如果只读或者disable，不绑定点击事件。
        if (this.$el.prop("readonly") || this.$el.prop("disabled")) {
            return;
        }

        // 覆盖层
        this.$cover.on("click", function () {
            that.$cover.popover("show");
        });

        this.$cover.on("shown.bs.popover", function () {

            var $modal = $(this).next(".popover");

            // 事件注册
            if (that.isInit === false) {
                $modal
                    .on("click", "#select-clear", function () { // 清空按钮按下后事件绑定
                        that.clean($modal);
                    })
                    //---------------------------------------------------------------------
                    .on("click", "#select-ok", function () { // 确定按钮按下后事件绑定
                        that.$cover.empty();
                        // 赋值
                        that.$el.val($.map(that.tempData, function (n) {
                            return n["id"];
                        }).join(that.options.separator));

                        // 画面显示
                        $.each(that.tempData, function (index, obj) {
                            that.$cover.append("<span class='select-cover-selected' title='" + obj["text"] + "'>" + obj["text"] + "</span>");
                        });

                        // 变更前后数据保存
                        that.previousSelected = that.selectedData;
                        that.selectedData = that.tempData;
                        $modal.popover("hide");
                    })
                    //---------------------------------------------
                    .on('click', '#select-close', function () {
                        that.$cover.popover("hide");
                    })
                    //---------------------------------------------------------------------
                    .on('click', ".select-item", function () {  // 各个项目点击事件
                        var $this = $(this);
                        $modal.find(".s-active").removeClass("s-active");
                        $(this).addClass("s-active");
                        var obj = that.objectMap[$this.data("code")];

                        if (!obj.isLeaf) { // 非叶子节点

                            var ul = $modal.find(".nav-tabs");
                            ul.children("li:gt(" + obj.level + ")").remove();
                            ul.append("<li role='presentation'></li>");
                            var li = ul.children("li:last");
                            li.empty();
                            li.html("<a href='#" + that.$el.attr("id") + "tab" + (obj.level + 1) + "' role='tab' data-toggle='tab'>" + obj.text + "</a>");
                            // tab内容
                            var div = $modal.find(".tab-content");
                            div.children("div:gt(" + obj.level + ")").remove();
                            div.append("<div role='tabpanel' class='tab-pane' id='" + that.$el.attr("id") + "tab" + (obj.level + 1) + "'>");
                            var tabContent = div.children(":last");
                            var html = [];
                            $.each(obj["subCode"], function () {
                                var _object = that.objectMap[this];
                                html.push("<span class='select-item' data-code='" + _object.key + "'>");
                                var subNode = this[that.options.subNodeField];
                                if (subNode && $.type(subNode) === "array") {
                                    html.push('<span class="glyphicon glyphicon-folder-close" aria-hidden="true"></span> ');
                                }
                                html.push(_object.text);
                                html.push("</span>");
                            });
                            tabContent.html(html.join(""));
                            // 激活tab页
                            li.children().trigger("click");

                            // that.refreshTempHtml(obj);
                        } else if (that.options.isMultiple === false) { //  单选
                            that.tempData = [];
                            that.tempData.push(obj);
                            $modal.find("#select-ok").prop("disabled", false);
                            $modal.find("#select-ok").trigger("click");
                        } else {

                            // 选择了一个叶子结点,多选
                            $modal.find(".nav-tabs li:gt('" + obj.level + "')").remove();
                            // tab内容
                            $modal.find(".tab-content div:gt(" + obj.level + ")").remove();

                            var selectDIV = $modal.find(".select-temp");
                            selectDIV.show();

                            var selecting = that.parents(obj.key);

                            var ol = selectDIV.children("ol");
                            ol.empty();
                            ol.html($.map(selecting, function (v) {
                                return "<li><a href='javascript:;' data-leaf='" + v.isLeaf + "'>" + v.text + "</a></li>";
                            }).join(""));

                            that.active = obj;

                            // 多选的时候需要显示加号图标
                            selectDIV.children(".select-temp-plus").empty();
                            selectDIV.children(".select-temp-plus").html("<button class='btn btn-primary selector-add'><i class='fa fa-plus-circle'></i></button>");
                        }

                    })
                    //---------------------------------------------------------------------
                    .on("click", ".selector-add", function () {
                        // 多选的时候，+ 按钮按下处理
                        if (that.active && $.inArray(that.active, that.tempData) < 0) {
                            that.tempData.push(that.active);
                            that.refreshSeletedArea($modal);
                        }
                    })
                    //---------------------------------------------------------------------
                    .on("click", ".select-selected", function () {

                        var code = $(this).data("code");
                        // 多选的时候，已选项目点击，取消
                        $.each(that.tempData, function (i, v) {
                            if (this.key === code) {
                                that.tempData.splice(i, 1);
                                return false;
                            }
                        });
                        that.refreshSeletedArea($modal);
                    });
                //---------------------------------------------------------------------

                // 设置已经初始化了事件
                that.isInit = true;
            }

            that.refreshSeletedArea($modal);

        });

        this.$el.trigger("change");

    };

    FpSelector.prototype.clean = function () {
        this.$cover.text("");
        this.$el.val("");
        this.selectedData = {};
        this.tempData = [];
        this.active = undefined;
        this.$cover.popover("hide");
    };

    FpSelector.prototype.buildHtml = function () {

        var that = this;
        var html = [];
        html.push("<div class='select-contain' data-selector-init='N'>");
        html.push("<div class='select-range'></div>");

        html.push("<div class='select-temp' style='display:none'>");
        html.push("<ol class='breadcrumb'></ol>");
        html.push("<span class='text-primary pull-right select-temp-plus'></span>");
        html.push("</div>");

        html.push("<div class='select-body'>");
        html.push("<ul class='nav nav-tabs' role='tablist'>");
        html.push("<li role='presentation' class='active'><a href='#" + this.$el.attr("id") + "tab0' role='tab' data-toggle='tab'>/</a></li>");
        html.push("</ul>");
        html.push("<div class='tab-content select-tab-content'>");
        html.push("<div role='tabpanel' class='tab-pane active' id='" + this.$el.attr("id") + "tab0'>");

        $.each(this.data, function () {
            html.push("<span class='select-item' data-code='" + this[that.options.valueField] + "'>");
            var subNode = this[that.options.subNodeField];
            if (subNode && $.type(subNode) === "array") {
                html.push('<span class="glyphicon glyphicon-folder-close" aria-hidden="true"></span> ');
            }
            html.push(this[that.options.textField]);
            html.push("</span>");
        });
        html.push("</div>");
        html.push("</div>");
        html.push("</div>");

        html.push("<hr>");
        html.push("<div class='row'>");
        html.push("<div class='col-sm-offset-5 col-sm-2'>");
        html.push("<button class='btn btn-default btn-sm' id='select-clear' type='button'>");
        html.push("<i class='fa fa-undo'></i>");
        html.push("&nbsp;清空");
        html.push("</button>");
        html.push("</div>");
        html.push("<div class='col-sm-2'>");
        html.push("<button class='btn btn-default btn-sm' id='select-close' type='button'>");
        html.push("<i class='glyphicon glyphicon-remove'/>");
        html.push("&nbsp;关闭");
        html.push("</button>");
        html.push("</div>");
        html.push("<div class='col-sm-2'>");
        html.push("<button class='btn btn-default btn-sm' id='select-ok' disabled='disabled' type='button'>");
        html.push("<i class='glyphicon glyphicon-ok'/>");
        html.push("&nbsp;确定");
        html.push("</button>");
        html.push("</div>");
        html.push("</div>");

        html.push("</div>");
        return html.join("");
    };

    FpSelector.prototype.refreshSeletedArea = function ($modal) {
        var $range = $modal.find(".select-range");
        $range.empty();
        $range.html(
            $.map(this.tempData, function (v) {
                return ("<span class='select-selected' data-code='" + v.key + "'>" + v.text + "</span>");
            }).join("")
        );
        $modal.find("#select-ok").prop("disabled", this.tempData.length == 0);
    };

    FpSelector.prototype.obj2Text = function (objArray, propName) {
        var _array = [];
        $.each(objArray, function () {
            _array.push(this[propName]);
        });
        return _array.join(" / ");
    };

    FpSelector.prototype.parents = function (key, _array) {
        if (!_array) {
            _array = [];
        }
        if (!key) {
            return _array;
        }

        var obj = this.objectMap[key];
        if (obj) {
            _array.unshift(obj);
            this.parents(obj.p, _array);
        }
        return _array;
    };

    // 数据转成map，方便查找
    FpSelector.prototype.buildDataMap = function (data, parentKey, parentLevel) {

        var that = this;
        if (data && $.type(data) === "array") {
            $.each(data, function () {
                var obj = {};
                obj.key = this[that.options.valueField];
                obj.text = this[that.options.textField];
                obj.p = parentKey ? parentKey : "-";
                obj.level = ($.type(parentLevel) === "number") ? (parentLevel + 1) : 0;
                obj.data = this; // 保存一份

                if (this[that.options.subNodeField]
                    && $.isArray(this[that.options.subNodeField])
                    && this[that.options.subNodeField].length > 0) {
                    obj.isLeaf = false;
                    obj.subCode = [];
                    $.each(this[that.options.subNodeField], function () {
                        obj.subCode.push(this[that.options.valueField]);
                    });
                    that.buildDataMap(this[that.options.subNodeField], obj.key, obj.level);
                } else {
                    obj.isLeaf = true;
                }
                that.objectMap[obj.key] = obj;
            });
        }
    };


    FpSelector.prototype.destroy = function () {

    };

    // 事件
    // =========================
    FpSelector.prototype.EVENTS = {};

    $.fn.fpSelector = function (option) {
        var value,
            args = Array.prototype.slice.call(arguments, 1);

        this.each(function () {
            var $this = $(this),
                data = $this.data('fp.selector'),
                options = $.extend({}, FpSelector.DEFAULTS, $this.data(), typeof option === 'object' && option);

            if (typeof option === 'string') {
                if ($.inArray(option, allowedMethods) < 0) {
                    throw new Error("Unknown method: " + option);
                }
                if (!data) {
                    return;
                }

                value = data[option].apply(data, args);

                if (option === 'destroy') {
                    data.destroy();
                    $this.removeData('fp.selector');
                }
            }
            if (!data) {
                $this.data('fp.selector', (data = new FpSelector(this, options)));
            }
        });

        return typeof value === 'undefined' ? this : value;
    };

    $(function () {
        $('[data-type="selector"]').fpSelector();
    });


})(window.jQuery);
