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
    const pluginName = "VaSe",
        pluginNameLower = pluginName.toLowerCase(),
        formObjPrefix = 'vase--',
        inputAllMask = 'input, select, textarea',

        defaults = {
            api: {
                url: '',
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
                status_sending: "Sending form...",
                status_success: "Form sent successfuly",
                status_error: "Server encountered an error",
            },
            //form info
            form: {
                novalidate: true,
                form: null,
                status: null,
            },
            input: {
                input_container_class: '.input',
                correct_input_class: formObjPrefix + 'correct-input',
                wrong_input_class: formObjPrefix + 'wrong-input',
                fields: [
                    /*
                    {
                        obj: null,
                        label: null,
                        status: null,
                        type: 'tel',
                        element_type: 'field',
                        field_data_type: 'phone', //possible types: phone, name, email. Used for regex_table
                        max_length: 20,
                        wrong_input_text: 'Incorrect phone format',
                        required: true
                    },
                    */
                ],
                agreements: [
                    /*
                    {
                        obj: null,
                        label: null,
                        status: null,
                        type: 'checkbox',
                        required: true,
                        checked: true,
                    }
                    */
                ],
                regex_table: {
                    'alpha': /^.*$/,
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
                    // before: {
                    //     function: null,
                    //     this: this,
                    //     parameters: null,
                    // },
                    // success: {
                    //     function: null,
                    //     this: this,
                    //     parameters: null,
                    // },
                    // error: {
                    //     function: null,
                    //     this: this,
                    //     parameters: null,
                    // }
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
        this._nameLower = pluginNameLower;
        this._objPrefix = formObjPrefix;
        this._inputAllMask = inputAllMask;
        this._methods = methods;

        //dynamic vars
        this.html = $('html');

        //form
        this.form = {
            obj: null,
            status: null,
        };

        this._methods.init(this);
    }

    // Avoid Plugin.prototype conflicts
    // $.extend(Plugin.prototype, {
    const methods = {
        //if(jQuery.fn.pluginName) {...} - check for functions from other plugins (dependencies)

        init: function (instance) {

            // Place initialization logic here
            // You already have access to the DOM element and
            // the options via the instance, e.g. instance.element
            // and instance.settings
            // you can add more functions like the one below and
            // call them like the example bellow
            instance._methods.initForm(instance);
        },

        /*
         * Main function for initializing popup body
         */
        initForm: function (instance) {
            instance._methods.initForm_generate_defaults(instance);

            //find references to sections

            //form content
            instance._methods.initForm_generate_content(instance);

            //apply event listeners to elements contained in form
            instance._methods.formAppendEventListeners(instance);

            //apply miscellaneous plugins
            instance._methods.formApplyMisc(instance);
        },

        /*
         * Set default values of settings if not specified
         */
        initForm_generate_defaults: function (instance) {
            instance.form.jq_obj = $(instance.element);
            instance.form.status = instance.settings.form.status;

            //add novalidate attribute if applicable
            if(instance.settings.form.novalidate) {
                instance.form.jq_obj.attr('novalidate', 'novalidate');
            }

            //set form url if not specified in settings
            if(!instance.settings.api.url) {
                instance.settings.api.url = instance.form.jq_obj.attr('action');
            }

            //set form method if not specified in settings
            if(!instance.settings.data.form_method) {
                instance.settings.data.form_method = instance.form.jq_obj.attr('method');
            }

            //set callback success and error functions if not set
            // if(!instance.settings.callbacks.onSend.success) {
            //     instance.settings.callbacks.onSend.success = {
            //         function: instance._methods.SendDataReturn,
            //         this: instance,
            //         parameters: [instance, {reset_input: true, message: objThis.settings.text_vars.status_success, style: 'success'}]
            //     }
            // }
            // if(!instance.settings.callbacks.onSend.error) {
            //     instance.settings.callbacks.onSend.error = {
            //         function: instance._methods.SendDataReturn,
            //         this: instance,
            //         parameters: [instance, {reset_input: false, message: objThis.settings.text_vars.status_error, style: 'error'}]
            //     }
            // }
        },

        /*
         * Builders for form body
         */
        initForm_generate_content: function (instance) {
            let all_fields = instance.form.jq_obj.find('[data-' + instance._nameLower + ']');

            //input fields of the form
            let fields = [];
            //input fields of the form that act as an agreement to terms
            let agreements = [];
            //form status section
            let status = $([]);

            all_fields.each(function () {
                let $this = $(this);
                let data = $this.data(instance._nameLower);
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

            if(!instance.settings.input.fields.length) {
                instance.settings.input.fields = fields;
            }
            if(!instance.settings.input.agreements.length) {
                instance.settings.input.agreements = agreements;
            }
            if(!instance.form.status) {
                instance.form.status = status;
            }

            //form fields
            instance._methods.initForm_generate_fields(instance);

            //form agreements
            instance._methods.initForm_generate_agreements(instance);
        },

        initForm_generate_fields: function (instance) {
            let fields_length = instance.settings.input.fields.length;

            for(let i = 0; i < fields_length; i++) {
                let $this = instance.settings.input.fields[i].obj;

                let new_field = instance._methods.initForm_generate_single_field(instance, $this, instance.settings.input.fields[i]);

                instance.settings.input.fields[i] = new_field;
            }
        },

        initForm_generate_single_field: function (instance, _ele, _options) {
            let defaults = {

            };
            let settings = $.extend({}, defaults, _options);
            
            let $this = _ele; //$(this);

            //get data variables from html
            let field_data = $this.data(instance._nameLower);

            let input_container = '';
            let input_type = '';
            let field_data_type = '';
            let wrong_input_text = '';

            if(field_data) {
                //field_data = field_data.toJSON();
                input_container = $this.closest(instance.settings.input.input_container_class);
                input_type = $this.attr('type');
                field_data_type = field_data.field_data_type; //$this.data('vase-field-type');

                wrong_input_text = field_data.wrong_input_text; //$this.data('vase-wrong-text');
                if(!wrong_input_text) {
                    wrong_input_text = instance.settings.text_vars.wrong_input_text;
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

            let new_field = {
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

        initForm_generate_agreements: function (instance) {
            let fields_length = instance.settings.input.agreements.length;

            for(let i = 0; i < fields_length; i++) {
                let $this = instance.settings.input.agreements[i].obj;

                let new_field = instance._methods.initForm_generate_single_agreement_field(instance, $this, instance.settings.input.agreements[i]);

                instance.settings.input.agreements[i] = new_field;
            }
        },

        initForm_generate_single_agreement_field: function (instance, _ele, _options) {
            let defaults = {

            };
            let settings = $.extend({}, defaults, _options);
            
            let $this = _ele; //$(this);

            //get data variables from html
            let field_data = $this.data(instance._nameLower);

            let input_container = '';
            let input_type = '';
            let field_data_type = '';
            let wrong_input_text = '';

            if(field_data) {
                //field_data = field_data.toJSON();

                input_container = $this.closest(instance.settings.input.input_container_class);
                input_type = $this.attr('type');
                field_data_type = field_data.field_data_type; //$this.data('vase-field-type');

                wrong_input_text = field_data.wrong_input_text; //$this.data('vase-wrong-text');
                if(!wrong_input_text) {
                    wrong_input_text = instance.settings.text_vars.wrong_input_text;
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

            let new_field = {
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
        formAppendEventListeners: function (instance) {
            //form input blur / input
            for(let i = 0; i < instance.settings.input.fields.length; i++) {
                let field = instance.settings.input.fields[i];
                field.obj.data(instance._objPrefix + 'index', i);
                field.obj.on('input', function (e) {
                    let $this = $(this);
                    let index = $this.data(instance._objPrefix + 'index');
                    //validate input
                    let validated = instance._methods.ValidateForm(instance, [instance.settings.input.fields[index]], {append_status: false, focus_first_wrong: false, clear_status_if_empty: true});
                    //send form if validated
                    if (validated) {
                        console.log('input validation successful');
                    }

                    //add class has-content if the input isn't empty
                    instance._methods.formCheckIfInputHasContent(instance, $this);

                    return false;
                });

                instance._methods.formCheckIfInputHasContent(instance, field.obj);
            }

            //form agreement blur / input
            for(let i = 0; i < instance.settings.input.agreements.length; i++) {
                let agreement = instance.settings.input.agreements[i];
                agreement.obj.data(instance._objPrefix + 'index', i);
                agreement.obj.on('change', function (e) {
                    let index = $(this).data(instance._objPrefix + 'index');
                    //validate input
                    let validated = instance._methods.ValidateForm(instance, [instance.settings.input.agreements[index]], {append_status: false, focus_first_wrong: false, clear_status_if_empty: true});
                    //send form if validated
                    if (validated) {
                        console.log('agreement validation successful');
                    }

                    return false;
                });
            }

            //form submit
            instance.form.jq_obj.on('submit', function (e) {
                //callback from obj settings: onSend:before
                if (instance.settings.callbacks.onSend.before && instance.settings.callbacks.onSend.before.function && $.isFunction(instance.settings.callbacks.onSend.before.function)) {
                    instance.settings.callbacks.onSend.before.function.apply(instance.settings.callbacks.onSend.before.this, [$.extend(true, {}, instance.settings.callbacks.onSend.before.parameters)]);
                }

                let status = instance._methods.SendData(instance, {
                    callback: {
                        // success: objThis.settings.callbacks.onSend.success,
                        // error: objThis.settings.callbacks.onSend.error,
                        success: {
                            function: instance._methods.SendDataReturn,
                            this: instance,
                            parameters: [instance, {reset_input: true, message: instance.settings.text_vars.status_success, style: 'success'}]
                        },
                        error: {
                            function: instance._methods.SendDataReturn,
                            this: instance,
                            parameters: [instance, {reset_input: false, message: instance.settings.text_vars.status_error, style: 'error'}]
                        }
                    }
                });

                //status
                console.log('Submit form status: ' + status.success + ', ' + status.message);

                return false;
            });
        },
        formCheckIfInputHasContent: function(instance, _input) {
            if(_input.val()) {
                _input.addClass(instance._objPrefix + 'has-content');
            } else {
                _input.removeClass(instance._objPrefix + 'has-content');
            }
        },

        /*
         * Apply miscellaneous plugins (ie. input mask)
         */
        formApplyMisc: function (instance) {
            /* --- js input mask --- */
            let inputs = instance.form.jq_obj.find(instance._inputAllMask);

            //check if exists
            console.log('js input mask: ' + (typeof $.fn.inputmask !== 'undefined'));
            if (typeof $.fn.inputmask !== 'undefined') {
                let input_masked_items = inputs.filter('input[type="tel"], .jsm--phone');
                let phones_mask = ["###-###-###", "## ###-##-##"];

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
        ValidateField: function (instance, _field, options) {
            let defaults = {

            };
            let settings = $.extend({}, defaults, options);

            let field = _field;
            let $this = field.obj;

            //return value. If all inputs are correctly validated, the value will remain true. If one fails, it switches to false
            let is_valid = true;

            //check if the input value is empty
            let is_empty = null;

            /* --- Validation --- */

            let $this_val;

            //special validation for select and checbkox
            //checkbox
            if(field.type === 'checkbox') {
                $this_val = $this.prop('checked');

                if(field.required === true) {
                    if (!$this_val) {
                        is_valid = false;
                    }
                }
                //is_empty signifies if the input value is of 0 length
                is_empty = !$this_val;
            }

            //select
            //todo: select validate field
            else if(field.type === 'select') {
                $this_val = $this.val();

                if(field.required === true) {
                    if (!$this_val) {
                        is_valid = false;
                    }
                }
                //is_empty signifies if the input value is of 0 length
                is_empty = !$this_val;
            }
            //rest (textfields)
            else {
                $this_val = $this.val();

                if(field.required === true || $this_val) {
                    //define regex for field types
                    let regex_table = instance.settings.input.regex_table;

                    if (field.field_data_type && field.field_data_type in regex_table) {
                        let regex = regex_table[field.field_data_type];
                        if (!regex.test($this_val)) {
                            is_valid = false;
                        }
                    } else {
                        is_valid = false;
                    }

                    is_valid = is_valid && $this_val;
                }
                //is_empty signifies if the input value is of 0 length
                is_empty = !$this_val;
            }

            return {is_valid: is_valid, is_empty: is_empty, field: field};
        },

        /**
         * @return {boolean}
         */
        ValidateForm: function (instance, _fields, options) {
            let defaults = {
                append_status: true,
                focus_first_wrong: true,
                fade_duration: 300,
                clear_status_only: false,
                clear_status_if_empty: false,
            };
            let settings = $.extend({}, defaults, options);

            let fields = _fields;

            //return value. If all inputs are correctly validated, the value will remain true. If one fails, it switches to false
            let is_valid = true;

            /* --- Validation --- */

            //wrong inputs collection
            let wrong_inputs = []; // {obj: null, message: null}

            for(let i = 0; i < fields.length; i++) {
                let field = fields[i];
                let field_valid = instance._methods.ValidateField(instance, field);

                let $this = field.obj;
                let $this_container = field.container;//$this.closest(instance.settings.input.input_container_class);

                //find and remove old status
                let old_obj = $this_container.find('.' + instance._objPrefix + 'status');

                //if appending new status, delete the old status immediately. Otherwise, fade it out slowly
                if (settings.append_status) {
                    old_obj.remove();
                } else {
                    old_obj.fadeOut(settings.fade_duration, function () {
                        old_obj.remove();
                    });
                }

                //remove all status messaged underneath inputs if clear_status_only parameter is set or the parameter clear_status_if_empty and the input value is empty
                if(settings.clear_status_only || (settings.clear_status_if_empty && field_valid.is_empty === true)) {
                    $this.removeClass(instance.settings.input.correct_input_class);
                    $this_container.removeClass(instance.settings.input.correct_input_class);
                    $this.removeClass(instance.settings.input.wrong_input_class);
                    $this_container.removeClass(instance.settings.input.wrong_input_class);
                } else {
                    if(field_valid.is_valid) {
                        $this.removeClass(instance.settings.input.wrong_input_class);
                        $this_container.removeClass(instance.settings.input.wrong_input_class);
                        $this.addClass(instance.settings.input.correct_input_class);
                        $this_container.addClass(instance.settings.input.correct_input_class);
                    } else {
                        $this.removeClass(instance.settings.input.correct_input_class);
                        $this_container.removeClass(instance.settings.input.correct_input_class);
                        $this.addClass(instance.settings.input.wrong_input_class);
                        $this_container.addClass(instance.settings.input.wrong_input_class);

                        wrong_inputs.push({field: field, message: ''});

                        //add element signifying wrong input
                        if (settings.append_status) {
                            let $wrong_input_obj = $('<span class="' + instance._objPrefix + 'status"></span>');
                            $wrong_input_obj.text(field.wrong_input_text); //instance.settings.text_vars.wrong_input_text
                            $wrong_input_obj.hide();

                            field.status = $wrong_input_obj.appendTo($this_container);

                            $wrong_input_obj.fadeIn(settings.fade_duration);
                        }

                        is_valid = false;
                    }
                }
            }

            if (settings.focus_first_wrong && wrong_inputs.length > 0) {
                //sort by position in DOM
                wrong_inputs = instance._methods.objSortByPositionInDOM(wrong_inputs, 'field', 'obj');

                //focus first object in DOM
                wrong_inputs[0].field.obj.focus();
            }

            //xxx

            /* --- /Validation --- */

            return is_valid;
        },

        SendDataReturn: function(instance, options) {
            let defaults = {
                reset_input: true,
                message: '',
                style: '',
            };
            let settings = $.extend({}, defaults, options);

            if(settings.reset_input) {
                instance._methods.ResetInput(instance, {clear_status_only: true});
            }
            instance._methods.StatusClear(instance);
            instance._methods.StatusAdd(instance, settings.message, {style: settings.style});
        },

        ResetInput: function (instance, options) {
            let defaults = {
                clear_status_only: false,
            };
            let settings = $.extend({}, defaults, options);

            let form = instance.form.jq_obj;
            form[0].reset();

            //validate after resetting the form
            instance._methods.ValidateForm(instance, instance.settings.input.fields, {append_status: false, focus_first_wrong: false, clear_status_only: settings.clear_status_only});
            instance._methods.ValidateForm(instance, instance.settings.input.agreements, {append_status: false, focus_first_wrong: false, clear_status_only: settings.clear_status_only});
        },

        /* ------ Form data ------ */

        /**
         * @return {boolean}
         */
        SendData: function (instance, options) {
            let status = {success: false, message: 'SendData: Error (Default)'};

            let defaults = {
                url: instance.settings.api.url,
                api_custom: instance.settings.api.custom,
                data: instance.form.jq_obj.serialize(),
                data_dictionary: instance.settings.input.data_dictionary,
                type: instance.settings.data.form_method,
                success_param: instance.settings.api.param.success, //bool - true for success, false for failure
                return_param: instance.settings.api.param.message, //the key of returned data (preferably an array) from the API which contains the response
                status_sending_text: instance.settings.text_vars.status_sending,
                send_headers: instance.settings.data.send_headers
            };
            let settings = $.extend(true, {}, defaults, options);

            //remove all status messages
            instance._methods.StatusClear(instance);

            //validate input
            let validated_fields = instance._methods.ValidateForm(instance, instance.settings.input.fields);
            let validated_agreements = instance._methods.ValidateForm(instance, instance.settings.input.agreements);
            let validated = validated_fields && validated_agreements;

            //send form if validated
            if (validated) {
                console.log('Validation successful');
                console.log('Attempting to send data...');

                //set message showing that data is being sent
                instance._methods.StatusClear(instance);
                instance._methods.StatusAdd(instance, settings.status_sending_text, {});

                status = instance._methods.SendDataAjax(instance, settings);
            } else {
                status = {success: false, message: 'SendData: Error (Validation)'};
            }

            return status;
        },
        SendDataAjax: function (instance, options) {
            let status = {success: false, message: 'SendDataAjax: Error (Default)'};

            //set settings
            let defaults = {
                url: '/',
                type: 'POST',
                api_custom: [],
                data: '',
                data_dictionary: {},
                success_param: {name: 'result', value: 'success'}, //name of parameter in returned data from API that contains the success response
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
            let settings = $.extend(true, {}, defaults, options);

            //extend data from form with custom data
            if (settings.api_custom) {
                let api_custom_length = settings.api_custom.length;
                let custom_data_string = '';

                if (settings.data.length > 0) {
                    custom_data_string += '&';
                }

                for (let i = 0; i < api_custom_length; i++) {
                    custom_data_string += settings.api_custom[i].name + '=' + settings.api_custom[i].value;

                    if (i < api_custom_length - 1) {
                        custom_data_string += '&';
                    }
                }

                settings.data += encodeURI(custom_data_string);
            }

            //use a custom dictionary specific to API to convert key names to the valid values
            let data_dictionary_keys = Object.keys(settings.data_dictionary);
            for (let i = 0; i < data_dictionary_keys.length; i++) {
                let regex = settings.data_dictionary[data_dictionary_keys[i]];
                console.log(data_dictionary_keys[i] + ' > ' + regex);
                //use regex to replace form field names into those specified in the dictionary
                settings.data = settings.data.replace(data_dictionary_keys[i], regex);
            }

            console.log(settings);

            //AJAX CALL

            //if no ajax call is currently processing
            if (instance.settings.status.ajax_processing) {
                status = {success: false, message: 'SendDataAjax: Error (Processing...)'};
            } else {
                instance.settings.status.ajax_processing = true;
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
                        let response_success = false;
                        let return_message;

                        console.log(data);

                        if (data[settings.return_param]) {
                            if($.isArray(data[settings.return_param])) {
                                for (let index in data[settings.return_param]) {
                                    console.log(data[settings.return_param][index]);
                                }
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
                            //check if default callback is set and is a function
                            if (settings.callback.success && settings.callback.success.function && $.isFunction(settings.callback.success.function)) {
                                //call the callback function after the function is done
                                settings.callback.success.function.apply(settings.callback.success.instance, settings.callback.success.parameters);
                            }
                            //callback from obj settings
                            if (instance.settings.callbacks.onSend.success && instance.settings.callbacks.onSend.success.function && $.isFunction(instance.settings.callbacks.onSend.success.function)) {
                                instance.settings.callbacks.onSend.success.function.apply(instance.settings.callbacks.onSend.success.this, [$.extend(true, {}, data, instance.settings.callbacks.onSend.success.parameters)]);
                            }
                        } else {
                            //CALLBACK
                            //ERROR
                            //check if default callback is set and is a function
                            if (settings.callback.error && settings.callback.error.function && $.isFunction(settings.callback.error.function)) {
                                //call the callback function after the function is done
                                settings.callback.error.function.apply(settings.callback.error.this, settings.callback.error.parameters);
                            }
                            //callback from obj settings
                            if (instance.settings.callbacks.onSend.error && instance.settings.callbacks.onSend.error.function && $.isFunction(instance.settings.callbacks.onSend.error.function)) {
                                instance.settings.callbacks.onSend.error.function.apply(instance.settings.callbacks.onSend.error.this, [$.extend(true, {}, data, instance.settings.callbacks.onSend.error.parameters)]);
                            }

                            //if show response from api settings is set to true, view the message
                            if(instance.settings.status.response_from_api_visible && return_message) {
                                instance._methods.StatusAdd(instance, return_message, {style: 'error'});
                            }
                        }

                        instance.settings.status.ajax_processing = false;
                    },
                    error: function (data) {
                        // Error...
                        console.log('API status: ' + data.status);
                        console.log('API message: ');
                        console.log(data[settings.return_param]);

                        status = {success: false, message: 'Error (API x:0)'};

                        instance.settings.status.ajax_processing = false;

                        //CALLBACK

                        //ERROR
                        //check if default callback is set and is a function
                        if (settings.callback.error && settings.callback.error.function && $.isFunction(settings.callback.error.function)) {
                            //call the callback function after the function is done
                            settings.callback.error.function.apply(settings.callback.error.this, settings.callback.error.parameters);
                        }
                        //callback from obj settings
                        if (instance.settings.callbacks.onSend.error && instance.settings.callbacks.onSend.error.function && $.isFunction(instance.settings.callbacks.onSend.error.function)) {
                            instance.settings.callbacks.onSend.error.function.apply(instance.settings.callbacks.onSend.error.this, [$.extend(true, {}, data, instance.settings.callbacks.onSend.error.parameters)]);
                        }
                    }
                });
            }

            return status;
        },

        /* Status messages */

        StatusAdd: function(instance, _message, options) {
            //set settings
            let defaults = {
                fade_duration: 300,
                style: ''
            };
            let settings = $.extend({}, defaults, options);

            /* --- */

            let message = $('<p></p>');
            message.text(_message);
            message.appendTo(instance.form.status);
            message.hide();

            if(settings.style === 'success') {
                instance._methods.StatusClearStyle(instance);
                instance.form.status.addClass('success');
            } else if(settings.style === 'error') {
                instance._methods.StatusClearStyle(instance);
                instance.form.status.addClass('error');
            }

            message.fadeIn(settings.fade_duration);
        },
        StatusClearStyle: function(instance) {
            //reset css classes
            instance.form.status.removeClass('success error');
        },
        StatusClear: function(instance) {
            instance._methods.StatusClearStyle(instance);
            //remove contents
            instance.form.status.empty();
        },

        /* ------------------------------ HELPERS ------------------------------- */

        /*
         * Sort an array containing DOM elements by their position in the document (top to bottom)
         */
        objSortByPositionInDOM: function (input, attr, attr2) {
            //sort by position in DOM
            let _input = input;
            let output;
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
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations

    // default outside method call: pluginInstance._methods.nameOfAnInnerFunction(pluginInstance, arg1, arg2...);
    $.fn[pluginName] = function (options) {
        let instances = [];

        this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                let instance = new Plugin(this, options);
                $.data(this, "plugin_" +
                    pluginName, instance);
                instances.push(instance);
            }

            // Make it possible to access methods from public.
            // e.g `$element.plugin('method');`
            if (typeof options === 'string') {
                const args = Array.prototype.slice.call(arguments, 1);
                data[options].apply(data, args);
            }
        });

        if (instances.length === 1) {
            return instances[0];
        }

        return null
    };

})(jQuery, window, document);