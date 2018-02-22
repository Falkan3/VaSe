/*
 *  VaSe form validation - v0.0.1
 *  A form validation / ajax send plugin
 *
 *  Made by Adam Kocić (Falkan3)
 *  Under MIT License
 */
// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ($, window, document, undefined) {

    "use strict";

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variable rather than global
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = "VaSe",
        pluginNameLower = pluginName.toLowerCase(),
        form_obj_prefix = 'vase--',
        input_all_mask = 'input, select, textarea',

        defaults = {
            api: {
                url: 'test',
                custom: [
                    {name: 'api_key', value: ''},
                ],
                param: {
                    success: {name: 'result', value: 'success'}, //parameter named result will contain information about the call's success
                    message: '', //the key of returned data (preferably an array) from the API which contains the response
                },
            },
            //data
            data: {
                form_method: "post",
                send_headers: true,
            },
            //status
            status: {
                ajax_processing: false,
                response_from_api_visible: true,
            },
            //content - text
            text_vars: {
                wrong_input_text: "Wrong input",
                status_success: "Form sent successfuly",
                status_sending: "Sending form...",
                status_error: "Server encountered an error",
            },
            //form info
            novalidate: true,
            input: {
                input_container_class: '.input',
                correct_input_class: form_obj_prefix + 'correct-input',
                wrong_input_class: form_obj_prefix + 'wrong-input',
                fields: [
                    /*
                    {
                        obj: null,
                        label: null,
                        type: 'tel',
                        field_data_type: 'phone', //possible types: phone, name, email. Used for regex_table
                        max_length: 20,
                        required: true
                    },
                    */
                ],
                agreements: [
                    /*
                    {
                        obj: null,
                        type: 'checkbox',
                        required: true,
                        checked: true,
                    }
                    */
                ],
                regex_table: {
                    'alpha': /^$/,
                    'phone': /(\(?(\+|00)?48\)?([ -]?))?(\d{3}[ -]?\d{3}[ -]?\d{3})|([ -]?\d{2}[ -]?\d{3}[ -]?\d{2}[ -]?\d{2})/,
                    'email': /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    //^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčśšśžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŚŠŚŽ∂ð ,.'-]+$
                    'name': /^[a-zA-Z\u00E0\u00E1\u00E2\u00E4\u00E3\u00E5\u0105\u010D\u0107\u0119\u00E8\u00E9\u00EA\u00EB\u0117\u012F\u00EC\u00ED\u00EE\u00EF\u0142\u0144\u00F2\u00F3\u00F4\u00F6\u00F5\u00F8\u00F9\u00FA\u00FB\u00FC\u0173\u016B\u00FF\u00FD\u017C\u017A\u00F1\u00E7\u010D\u015B\u0161\u015B\u017E\u00C0\u00C1\u00C2\u00C4\u00C3\u00C5\u0104\u0106\u010C\u0116\u0118\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u012E\u0141\u0143\u00D2\u00D3\u00D4\u00D6\u00D5\u00D8\u00D9\u00DA\u00DB\u00DC\u0172\u016A\u0178\u00DD\u017B\u0179\u00D1\u00DF\u00C7\u0152\u00C6\u010C\u015A\u0160\u015A\u017D\u2202\u00F0 ,.'-]+$/,
                },
                //dictionary is used to exchange input names into values from the dictionary on API request
                data_dictionary: {} //'sc_fld_telephone': 'phone'
            },
            callbacks: {
                onSend: {
                    success: {
                        function: null,
                        this: this,
                        parameters: null,
                    },
                    error: {
                        function: null,
                        this: this,
                        parameters: null,
                    }
                }
            }
        };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;

        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.settings = $.extend(true, {}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;

        //dynamic vars
        this.html = $('html');

        //form
        this.form = {
            obj: null,
            footer: null,
        };

        this.init();
    }

    // Avoid Plugin.prototype conflicts
    $.extend(Plugin.prototype, {
        //if(jQuery.fn.pluginName) {...} - check for functions from other plugins (dependencies)

        init: function () {

            // Place initialization logic here
            // You already have access to the DOM element and
            // the options via the instance, e.g. this.element
            // and this.settings
            // you can add more functions like the one below and
            // call them like the example bellow
            this.initForm();
        },

        /*
         * Main function for initializing popup body
         */
        initForm: function () {
            var objThis = this;

            this.form.obj = $(this.element);
            this.form.status = null;

            //add novalidate attribute if applicable
            if(this.settings.novalidate) {
                this.form.obj.attr('novalidate', 'novalidate');
            }

            //find references to sections

            //form content
            this.initForm_generate_content();

            //apply event listeners to elements contained in form
            this.formAppendEventListeners();

            //apply miscellaneous plugins
            this.formApplyMisc();
        },

        /*
         * Builders for form body
         */
        initForm_generate_content: function () {
            var all_fields = this.form.obj.find('[data-' + pluginNameLower + ']');

            //input fields of the form
            var fields = [];
            //input fields of the form that act as an agreement to terms
            var agreements = [];
            //form status section
            var status = $([]);

            all_fields.each(function () {
                var $this = $(this);
                var data = $this.data(pluginNameLower);
                if (data) {
                    //data = JSON.parse(data);

                    data.obj = $this;

                    if (data.element_type === 'field') {
                        fields.push(data);
                    }
                    else if (data.element_type === 'agreement') {
                        agreements.push(data);
                    }
                    else if (data.element_type === 'status') {
                        status = status.add($this);
                    }
                }
            });

            if(!this.settings.input.fields.length) {
                this.settings.input.fields = fields;
            }
            if(!this.settings.input.agreements.length) {
                this.settings.input.agreements = agreements;
            }
            if(!this.form.status) {
                this.form.status = status;
            }

            //form fields
            this.initForm_generate_fields();

            //form agreements
            this.initForm_generate_agreements();
        },

        initForm_generate_fields: function () {
            var objThis = this;

            var fields_length = this.settings.input.fields.length;

            for(var i = 0; i < fields_length; i++) {
                var $this = this.settings.input.fields[i].obj;

                var new_field = objThis.initForm_generate_single_field($this, this.settings.input.fields[i]);

                this.settings.input.fields[i] = new_field;
            }
        },

        initForm_generate_single_field: function (_ele, _options) {
            var defaults = {

            };
            var settings = $.extend({}, defaults, _options);

            var objThis = this;
            var $this = _ele; //$(this);

            //get data variables from html
            var field_data = $this.data(pluginNameLower);
            if(field_data) {
                //field_data = field_data.toJSON();

                var input_container = $this.closest(objThis.settings.input.input_container_class);
                var input_type = $this.attr('type');
                var field_data_type = field_data.field_data_type; //$this.data('vase-field-type');

                var wrong_input_text = field_data.wrong_input_text; //$this.data('vase-wrong-text');
                if(!wrong_input_text) {
                    wrong_input_text = objThis.settings.text_vars.wrong_input_text;
                }
            }

            if(!field_data_type) {
                switch(input_type) {
                    case 'tel':
                        field_data_type = 'phone';
                        break;
                    case 'email':
                        field_data_type = 'email';
                        break;
                    default:
                        field_data_type = 'alpha';
                        break;
                }
            }

            var new_field = {
                obj: $this,
                container: input_container,
                label: input_container.find('label'),
                type: input_type,
                field_data_type: field_data_type,
                max_length: $this.attr('max-length'),
                required: $this.prop('required'),

                wrong_input_text: wrong_input_text,
            };
            if(settings) {
                new_field = $.extend({}, new_field, settings);
            }

            return new_field;
        },

        initForm_generate_agreements: function () {
            var objThis = this;

            var fields_length = this.settings.input.agreements.length;

            for(var i = 0; i < fields_length; i++) {
                var $this = this.settings.input.agreements[i].obj;

                var new_field = objThis.initForm_generate_single_agreement_field($this, this.settings.input.agreements[i]);

                this.settings.input.agreements[i] = new_field;
            }
        },

        initForm_generate_single_agreement_field: function (_ele, _options) {
            var defaults = {

            };
            var settings = $.extend({}, defaults, _options);

            var objThis = this;
            var $this = _ele; //$(this);

            //get data variables from html
            var field_data = $this.data(pluginNameLower);
            if(field_data) {
                //field_data = field_data.toJSON();

                var input_container = $this.closest(objThis.settings.input.input_container_class);
                var input_type = $this.attr('type');
                var field_data_type = field_data.field_data_type; //$this.data('vase-field-type');

                var wrong_input_text = field_data.wrong_input_text; //$this.data('vase-wrong-text');
                if(!wrong_input_text) {
                    wrong_input_text = objThis.settings.text_vars.wrong_input_text;
                }
            }

            if(!field_data_type) {
                switch(input_type) {
                    case 'checkbox':
                        field_data_type = 'checkbox';
                        break;
                    case 'radio':
                        field_data_type = 'radio';
                        break;
                    default:
                        field_data_type = '';
                        break;
                }
            }

            var new_field = {
                obj: $this,
                container: input_container,
                label: input_container.find('label'),
                type: input_type,
                field_data_type: field_data_type,
                required: $this.prop('required'),

                wrong_input_text: wrong_input_text,
            };
            if(settings) {
                new_field = $.extend({}, new_field, settings);
            }

            return new_field;
        },

        /*
         * Append event listeners for clickable elements in popup window
         */
        formAppendEventListeners: function () {
            var objThis = this;

            //form input blur / input
            for(var i = 0; i < objThis.settings.input.fields.length; i++) {
                var field = objThis.settings.input.fields[i];
                field.obj.data(form_obj_prefix + 'index', i);
                field.obj.on('input', function (e) {
                    var $this = $(this);
                    var index = $this.data(form_obj_prefix + 'index');
                    //validate input
                    var validated = objThis.ValidateForm([objThis.settings.input.fields[index]], {append_status: false, focus_first_wrong: false});
                    //send form if validated
                    if (validated) {
                        console.log('input validation successful');
                    }

                    //add class has-content if the input isn't empty
                    if($this.val()) {
                        $this.addClass(form_obj_prefix + 'has-content');
                    } else {
                        $this.removeClass(form_obj_prefix + 'has-content');
                    }

                    return false;
                });
            }

            //form agreement blur / input
            for(var i = 0; i < objThis.settings.input.agreements.length; i++) {
                var agreement = objThis.settings.input.agreements[i];
                agreement.obj.data(form_obj_prefix + 'index', i);
                agreement.obj.on('change', function (e) {
                    var index = $(this).data(form_obj_prefix + 'index');
                    //validate input
                    var validated = objThis.ValidateForm([objThis.settings.input.agreements[index]], {append_status: false, focus_first_wrong: false});
                    //send form if validated
                    if (validated) {
                        console.log('agreement validation successful');
                    }

                    return false;
                });
            }

            //form submit
            this.form.obj.on('submit', function (e) {
                var status = objThis.SendData({
                    callback: {
                        success: {
                            function: objThis.SendDataReturn,
                            this: objThis,
                            parameters: [{reset_input: true, message: objThis.settings.text_vars.status_success, style: 'success'}]
                        },
                        error: {
                            function: objThis.SendDataReturn,
                            this: objThis,
                            parameters: [{reset_input: false, message: objThis.settings.text_vars.status_error, style: 'error'}]
                        }
                    }
                });

                //status
                console.log('Submit form status: ' + status.success + ', ' + status.message);

                return false;
            });
        },

        /*
         * Apply miscellaneous plugins (ie. input mask)
         */
        formApplyMisc: function () {
            /* --- js input mask --- */
            var inputs = this.form.obj.find(input_all_mask);

            //check if exists
            console.log('js input mask: ' + (typeof $.fn.inputmask !== 'undefined'));
            if (typeof $.fn.inputmask !== 'undefined') {
                var input_masked_items = inputs.filter('input[type="tel"], .jsm--phone');
                var phones_mask = ["###-###-###", "## ###-##-##"];

                console.log('js input mask || masked items: ');
                console.log(input_masked_items);

                input_masked_items.inputmask({
                    mask: phones_mask,
                    greedy: false,
                    definitions: {'#': {validator: "[0-9]", cardinality: 1}}
                });
            }
            /* --- /js input mask --- */
        },

        /* -------------------- PUBLIC METHODS -------------------- */

        /* ------ Input ------ */

        /**
         * @return {{is_valid: boolean, field: *}}
         */
        ValidateField: function (_field, options) {
            var defaults = {

            };
            var settings = $.extend({}, defaults, options);

            var field = _field;
            var $this = field.obj;

            //return value. If all inputs are correctly validated, the value will remain true. If one fails, it switches to false
            var is_valid = true;

            /* --- Validation --- */

            //special validation for select and checbkox
            //checkbox
            if(field.type === 'checkbox') {
                if(field.required === true) {
                    if (!$this.prop('checked')) {
                        is_valid = false;
                    }
                }
            }

            //select
            //todo: select validate field
            else if(field.type === 'select') {
                if(field.required === true) {
                    if (!$this.val()) {
                        is_valid = false;
                    }
                }
            }
            //rest (textfields)
            else {
                if(field.required === true || $this.val() !== '') {
                    //define regex for field types
                    var regex_table = this.settings.input.regex_table;

                    if (field.field_data_type && field.field_data_type in regex_table) {
                        var regex = regex_table[field.field_data_type];
                        if (!regex.test($this.val())) {
                            is_valid = false;
                        }
                    } else {
                        is_valid = false;
                    }
                }
            }

            return {is_valid: is_valid, field: field};
        },

        /**
         * @return {boolean}
         */
        ValidateForm: function (_fields, options) {
            var defaults = {
                append_status: true,
                focus_first_wrong: true,
                fade_duration: 300,
                clear_status_only: false
            };
            var settings = $.extend({}, defaults, options);

            var objThis = this;

            var fields = _fields;

            //return value. If all inputs are correctly validated, the value will remain true. If one fails, it switches to false
            var is_valid = true;

            /* --- Validation --- */

            //wrong inputs collection
            var wrong_inputs = []; // {obj: null, message: null}

            for(var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var field_valid = this.ValidateField(field);

                var $this = field.obj;
                var $this_container = field.container;//$this.closest(objThis.settings.input.input_container_class);

                //find and remove old status
                var old_obj = $this_container.find('.' + form_obj_prefix + 'status');

                //if appending new status, delete the old status immediately. Otherwise, fade it out slowly
                if (settings.append_status) {
                    old_obj.remove();
                } else {
                    old_obj.fadeOut(settings.fade_duration, function () {
                        old_obj.remove();
                    });
                }

                if(settings.clear_status_only) {
                    $this.removeClass(objThis.settings.input.correct_input_class);
                    $this_container.removeClass(objThis.settings.input.correct_input_class);
                    $this.removeClass(objThis.settings.input.wrong_input_class);
                    $this_container.removeClass(objThis.settings.input.wrong_input_class);
                } else {
                    if(field_valid.is_valid) {
                        $this.removeClass(objThis.settings.input.wrong_input_class);
                        $this_container.removeClass(objThis.settings.input.wrong_input_class);
                        $this.addClass(objThis.settings.input.correct_input_class);
                        $this_container.addClass(objThis.settings.input.correct_input_class);
                    } else {
                        $this.removeClass(objThis.settings.input.correct_input_class);
                        $this_container.removeClass(objThis.settings.input.correct_input_class);
                        $this.addClass(objThis.settings.input.wrong_input_class);
                        $this_container.addClass(objThis.settings.input.wrong_input_class);

                        wrong_inputs.push({field: field, message: ''});

                        //add element signifying wrong input
                        if (settings.append_status) {
                            var $wrong_input_obj = $('<span class="' + form_obj_prefix + 'status"></span>');
                            $wrong_input_obj.text(field.wrong_input_text); //this.settings.text_vars.wrong_input_text
                            $wrong_input_obj.hide();

                            $wrong_input_obj.appendTo($this_container);

                            $wrong_input_obj.fadeIn(settings.fade_duration);
                        }

                        is_valid = false;
                    }
                }
            }

            if (settings.focus_first_wrong && wrong_inputs.length > 0) {
                //sort by position in DOM
                wrong_inputs = this.objSortByPositionInDOM(wrong_inputs, 'field', 'obj');

                //focus first object in DOM
                wrong_inputs[0].field.obj.focus();
            }

            //xxx

            /* --- /Validation --- */

            return is_valid;
        },

        SendDataReturn: function(options) {
            var defaults = {
                reset_input: true,
                message: '',
                style: '',
            };
            var settings = $.extend({}, defaults, options);

            if(settings.reset_input) {
                this.ResetInput({clear_status_only: true});
            }
            this.StatusClear();
            this.StatusAdd(settings.message, {style: settings.style});
        },

        ResetInput: function (options) {
            var defaults = {
                clear_status_only: false,
            };
            var settings = $.extend({}, defaults, options);

            var form = this.form.obj;
            form[0].reset();

            //validate after resetting the form
            this.ValidateForm(this.settings.input.fields, {append_status: false, focus_first_wrong: false, clear_status_only: settings.clear_status_only});
            this.ValidateForm(this.settings.input.agreements, {append_status: false, focus_first_wrong: false, clear_status_only: settings.clear_status_only});
        },

        /* ------ Form data ------ */

        /**
         * @return {boolean}
         */
        SendData: function (options) {
            var status = {success: false, message: 'SendData: Error (Default)'};

            var defaults = {
                url: this.settings.api.url,
                api_custom: this.settings.api.custom,
                data: this.form.obj.serialize(),
                data_dictionary: this.settings.input.data_dictionary,
                type: this.settings.data.form_method,
                success_param: this.settings.api.param.success, //bool - true for success, false for failure
                return_param: this.settings.api.param.message, //the key of returned data (preferably an array) from the API which contains the response
                status_sending_text: this.settings.text_vars.status_sending,
                send_headers: this.settings.data.send_headers
            };
            var settings = $.extend(true, {}, defaults, options);

            //remove all status messages
            this.StatusClear();

            //validate input
            var validated_fields = this.ValidateForm(this.settings.input.fields);
            var validated_agreements = this.ValidateForm(this.settings.input.agreements);
            var validated = validated_fields && validated_agreements;

            //send form if validated
            if (validated) {
                console.log('Validation successful');
                console.log('Attempting to send data...');

                //set message showing that data is being sent
                this.StatusClear();
                this.StatusAdd(settings.status_sending_text, {});

                status = this.SendDataAjax(settings);
            } else {
                status = {success: false, message: 'SendData: Error (Validation)'};
            }

            return status;
        },
        SendDataAjax: function (options) {
            var status = {success: false, message: 'SendDataAjax: Error (Default)'};

            //set settings
            var objThis = this;
            var defaults = {
                url: '/',
                type: 'POST',
                api_custom: [],
                data: '',
                data_dictionary: {},
                success_param: {name: 'result', value: 'success'}, //name of parameter in returned data from API that contains the success reponse
                return_param: 'message', //the key of returned data (preferably an array) from the API which contains the response message
                send_headers: true,
                /*
                callback: {
                    success: {
                        function: alert,
                        this: undefined,
                        parameters: ['api success'],
                    },
                    error: {
                        function: alert,
                        this: undefined,
                        parameters: ['api error'],
                    }
                }
                */
            };
            var settings = $.extend(true, {}, defaults, options);

            //extend data from form with custom data
            if (settings.api_custom) {
                var api_custom_length = settings.api_custom.length;
                var custom_data_string = '';

                if (settings.data.length > 0) {
                    custom_data_string += '&';
                }

                for (var i = 0; i < api_custom_length; i++) {
                    custom_data_string += settings.api_custom[i].name + '=' + settings.api_custom[i].value;

                    if (i < api_custom_length - 1) {
                        custom_data_string += '&';
                    }
                }

                settings.data += encodeURI(custom_data_string);
            }

            //use a custom dictionary specific to API to convert key names to the valid values
            var data_dictionary_keys = Object.keys(settings.data_dictionary);
            for (var i = 0; i < data_dictionary_keys.length; i++) {
                var regex = settings.data_dictionary[data_dictionary_keys[i]];
                console.log(data_dictionary_keys[i] + ' > ' + regex);
                //use regex to replace form field names into those specified in the dictionary
                settings.data = settings.data.replace(data_dictionary_keys[i], regex);
            }

            console.log(settings);

            //AJAX CALL

            //if no ajax call is currently processing
            if (this.settings.status.ajax_processing) {
                status = {success: false, message: 'SendDataAjax: Error (Processing...)'};
            } else {
                this.settings.status.ajax_processing = true;
                status = {success: true, message: 'SendDataAjax: Success (Got into ajax)'};

                //Configure
                if(settings.send_headers) {
                    $.ajaxSetup({
                        headers: {
                            //'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                }

                $.ajax({
                    url: settings.url,
                    type: settings.type,
                    data: settings.data,
                    enctype: 'multipart/form-data',
                    dataType: 'json',
                    processData: false,
                    success: function (data) {
                        var response_success = false;
                        var return_message;

                        console.log(data);

                        if (data[settings.return_param]) {
                            for (var index in data[settings.return_param]) {
                                console.log(data[settings.return_param][index]);
                            }

                            //Show message from API
                            console.log('API status: ' + data.status);
                            console.log('API message: ');
                            console.log(data[settings.return_param]);
                        }

                        //format return message
                        if($.isArray(data[settings.return_param])) {
                            return_message = data[settings.return_param].join(', ');
                        } else {
                            return_message = data[settings.return_param];
                        }
                        console.log(return_message);

                        //check if the call to API was successful
                        if (data[settings.success_param.name]) {
                            if (data[settings.success_param.name] === settings.success_param.value) {
                                status = {success: true, message: 'Success (API x:200)'};

                                response_success = true;
                            } else {
                                response_success = false;
                            }
                        } else {
                            response_success = false;
                        }

                        //perform callbacks according to response status
                        if(response_success) {
                            //CALLBACK
                            //SUCCESS
                            //check if callback is set and is a function
                            if (settings.callback.success.function && $.isFunction(settings.callback.success.function)) {
                                //call the callback function after the function is done
                                settings.callback.success.function.apply(settings.callback.success.this, settings.callback.success.parameters);
                            }
                            //callback from obj settings
                            if (objThis.settings.callbacks.onSend.success.function && $.isFunction(objThis.settings.callbacks.onSend.success.function)) {
                                objThis.settings.callbacks.onSend.success.function.apply(objThis.settings.callbacks.onSend.success.this, [$.extend(true, {}, data, objThis.settings.callbacks.onSend.success.parameters)]);
                            }
                        } else {
                            //CALLBACK
                            //ERROR
                            //check if callback is set and is a function
                            if (settings.callback.error.function && $.isFunction(settings.callback.error.function)) {
                                //call the callback function after the function is done
                                settings.callback.error.function.apply(settings.callback.error.this, settings.callback.error.parameters);
                            }
                            //callback from obj settings
                            if (objThis.settings.callbacks.onSend.error.function && $.isFunction(objThis.settings.callbacks.onSend.error.function)) {
                                objThis.settings.callbacks.onSend.error.function.apply(objThis.settings.callbacks.onSend.error.this, [$.extend(true, {}, data, objThis.settings.callbacks.onSend.error.parameters)]);
                            }

                            //if show response from api settings is set to true, view the message
                            if(objThis.settings.status.response_from_api_visible && return_message) {
                                objThis.StatusAdd(return_message, {style: 'error'});
                            }
                        }

                        objThis.settings.status.ajax_processing = false;
                    },
                    error: function (data) {
                        // Error...
                        console.log('API status: ' + data.status);
                        console.log('API message: ');
                        console.log(data[settings.return_param]);

                        status = {success: false, message: 'Error (API x:0)'};

                        objThis.settings.status.ajax_processing = false;

                        //CALLBACK

                        //ERROR
                        //check if callback is set and is a function
                        if (settings.callback.error.function && $.isFunction(settings.callback.error.function)) {
                            //call the callback function after the function is done
                            settings.callback.error.function.apply(settings.callback.error.this, settings.callback.error.parameters);
                        }
                        if (objThis.settings.callbacks.onSend.error.function && $.isFunction(objThis.settings.callbacks.onSend.error.function)) {
                            objThis.settings.callbacks.onSend.error.function.apply(objThis.settings.callbacks.onSend.error.this, objThis.settings.callbacks.onSend.error.parameters);
                        }
                    }
                });
            }

            return status;
        },

        /* Status messages */

        StatusAdd: function(_message, options) {
            //set settings
            var defaults = {
                fade_duration: 300,
                style: ''
            };
            var settings = $.extend({}, defaults, options);

            /* --- */

            var message = $('<p></p>');
            message.text(_message);
            message.appendTo(this.form.status);
            message.hide();

            if(settings.style === 'success') {
                this.StatusClearStyle();
                this.form.status.addClass('success');
            } else if(settings.style === 'error') {
                this.StatusClearStyle();
                this.form.status.addClass('error');
            }

            message.fadeIn(settings.fade_duration);
        },
        StatusClearStyle: function() {
            //reset css classes
            this.form.status.removeClass('success error');
        },
        StatusClear: function() {
            this.StatusClearStyle();
            //remove contents
            this.form.status.empty();
        },

        /* ------------------------------ HELPERS ------------------------------- */

        /*
         * Sort an array containing DOM elements by their position in the document (top to bottom)
         */
        objSortByPositionInDOM: function (input, attr, attr2) {
            //sort by position in DOM
            var _input = input;
            var output;
            if(attr && attr2) {
                output = _input.sort(function (a, b) {
                    if (a[attr][attr2][0] === b[attr][attr2][0]) return 0;
                    if (!a[attr][attr2][0].compareDocumentPosition) {
                        // support for IE8 and below
                        return a[attr][attr2][0].sourceIndex - b[attr][attr2][0].sourceIndex;
                    }
                    if (a[attr][attr2][0].compareDocumentPosition(b[attr][attr2][0]) & 2) {
                        // b comes before a
                        return 1;
                    }
                    return -1;
                });
            }
            else if (attr) {
                output = _input.sort(function (a, b) {
                    if (a[attr][0] === b[attr][0]) return 0;
                    if (!a[attr][0].compareDocumentPosition) {
                        // support for IE8 and below
                        return a[attr][0].sourceIndex - b[attr][0].sourceIndex;
                    }
                    if (a[attr][0].compareDocumentPosition(b[attr][0]) & 2) {
                        // b comes before a
                        return 1;
                    }
                    return -1;
                });
            } else {
                output = _input.sort(function (a, b) {
                    if (a[0] === b[0]) return 0;
                    if (!a[0].compareDocumentPosition) {
                        // support for IE8 and below
                        return a[0].sourceIndex - b[0].sourceIndex;
                    }
                    if (a[0].compareDocumentPosition(b[0]) & 2) {
                        // b comes before a
                        return 1;
                    }
                    return -1;
                });
            }

            return output;
        },
    });

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function (options) {
        var instances = [];

        this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                var instance = new Plugin(this, options);
                $.data(this, "plugin_" +
                    pluginName, instance);
                instances.push(instance);
            }
        });

        if (instances.length === 1) {
            return instances[0];
        }

        return null
    };

})(jQuery, window, document);