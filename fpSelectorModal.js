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
 $this.trigger("on.selector.selected"); 确定按下后
 $this.trigger("on.selector.clear");    清空按下后
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
    var allowedMethods = [
        "destroy"
    ];

    //  初始化方法
    FpSelector.prototype.init = function () {

        var that = this;
        this.selectedData = [];
        this.previousSelected = [];
        this.tempData = [];
        this.objectMap = {};
        this.active = undefined;

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
                that.refreshSeletedArea();
            }
        });

        // 原控件如果只读或者disable，不绑定点击事件。
        if (!this.$el.prop("readonly") && !this.$el.prop("disabled")) {

            that.buildModal();

            // 设置各个选择项；同时绑定选择时候的事件
            this.setModalBody();

            // 清空按钮按下后事件绑定
            this.$modal.find("#select-clean").on("click", function () {
                that.clean();
            });

            // // 打开时事件绑定
            // this.$modal.modal('show.bs.modal', function () {
            //
            // });

            // 确定按钮按下后事件绑定
            this.$modal.find("#select-ok").on("click", function () {

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
                that.$modal.modal("hide");
            });


            // 覆盖层
            this.$cover.on("click", function () {
                that.$modal.modal({backdrop: 'static'});
            });

            this.$el.trigger("change");
        }
    };

    FpSelector.prototype.clean = function () {
        this.$cover.text("");
        this.$el.val("");
        this.selectedData = {};
        this.tempData = [];
        this.active = undefined;
        this.$modal.modal("hide");
        this.setModalBody();
    };

    FpSelector.prototype.buildModal = function () {

        var modalHtml = [];

        modalHtml.push('<div class="modal fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">');
        modalHtml.push('<div class="modal-dialog" role="document">');
        modalHtml.push('<div class="modal-content">');
        modalHtml.push('<div class="modal-header">');
        modalHtml.push('<h4 class="modal-title" id="myModalLabel">');
        modalHtml.push(this.options.title.concat(this.options.isMultiple ? " (多选)" : ""));
        modalHtml.push('</h4>');
        modalHtml.push('</div>');
        modalHtml.push('<div class="modal-body">');
        modalHtml.push('</div>');
        modalHtml.push('<div class="modal-footer">');
        modalHtml.push('<button type="button" class="btn btn-default" id="select-clean">清空</button>');
        modalHtml.push('<button type="button" class="btn btn-default" data-dismiss="modal">关闭</button>');
        modalHtml.push('<button type="button" class="btn btn-primary" id="select-ok">确定</button>');
        modalHtml.push('</div>');
        modalHtml.push('</div>');
        modalHtml.push('</div>');
        modalHtml.push('</div>');
        this.$modal = $(modalHtml.join(""));

    };


    FpSelector.prototype.setModalBody = function () {

        var that = this;
        var modalBody = this.$modal.find(".modal-body");
        modalBody.empty();

        var html = [];
        html.push("<div class='select-contain'>");
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

        $.each(that.data, function () {
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
        html.push("</div>");

        modalBody.html(html.join(""));

        modalBody.on('click', ".select-item", function () {

            var $this = $(this);
            modalBody.find(".s-active").removeClass("s-active");
            $(this).addClass("s-active");
            var obj = that.objectMap[$this.data("code")];

            if (!obj.isLeaf) { // 非叶子节点

                var ul = modalBody.find(".nav-tabs");
                ul.children("li:gt(" + obj.level + ")").remove();
                ul.append("<li role='presentation'></li>");
                var li = ul.children("li:last");
                li.empty();
                li.html("<a href='#" + that.$el.attr("id") + "tab" + (obj.level + 1) + "' role='tab' data-toggle='tab'>" + obj.text + "</a>");
                // tab内容
                var div = modalBody.find(".tab-content");
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
                that.$modal.find("#select-ok").trigger("click");
            } else {

                // 选择了一个叶子结点,多选
                modalBody.find(".nav-tabs li:gt('" + obj.level + "')").remove();
                // tab内容
                modalBody.find(".tab-content div:gt(" + obj.level + ")").remove();

                var selectDIV = modalBody.find(".select-temp");
                selectDIV.show();

                var selecting = that.parents(obj.key);

                var ol = selectDIV.children("ol");
                ol.empty();
                ol.html($.map(selecting, function (v) {
                    return "<li><a href='javascript:;' data-leaf='" + v.isLeaf + "'>" + v.text + "</a></li>";
                }).join(""));

                that.active = obj;

                // 多选的时候需要显示加号
                selectDIV.children(".select-temp-plus").empty();
                selectDIV.children(".select-temp-plus").html("<button class='btn btn-primary selector-add'><i class='fa fa-plus-circle'></i></button>");
            }

        }).on("click", ".selector-add", function () {
            // 多选的时候，+ 按钮按下处理
            if (that.active && $.inArray(that.active, that.tempData) < 0) {
                that.tempData.push(that.active);
                that.refreshSeletedArea();
            }
        }).on("click", ".select-selected", function () {

            var code = $(this).data("code");
            // 多选的时候，已选项目点击，取消
            $.each(that.tempData, function (i, v) {
                if (this.key === code) {
                    that.tempData.splice(i, 1);
                    return false;
                }
            });
            that.refreshSeletedArea();
        });
    };

    FpSelector.prototype.refreshSeletedArea = function () {
        var $range = this.$modal.find(".select-range");
        $range.empty();
        $range.html(
            $.map(this.tempData, function (v) {
                return ("<span class='select-selected' data-code='" + v.key + "'>" + v.text + "</span>");
            }).join("")
        );
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
