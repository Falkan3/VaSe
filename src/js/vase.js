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
        input_all_mask = 'input, select, textarea',

        defaults = {
            api: {
                url: 'test',
                custom: [
                    {name: 'api_key', value: ''},
                ],
                param: {
                    success: {name: 'result', value: 'success'},
                    message: '',
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
                status_error: "Server encountered and error",
            },
            //form info
            novalidate: true,
            input: {
                fields: [
                    {
                        obj: null,
                        name: 'phone',
                        label: 'Phone number',
                        type: 'tel',
                        data_field_type: 'phone', //possible types: phone, name, email. Used for regex_table
                        max_length: 20,
                        required: true
                    },
                ],
                regex_table: {
                    'phone': /(\(?(\+|00)?48\)?([ -]?))?(\d{3}[ -]?\d{3}[ -]?\d{3})|([ -]?\d{2}[ -]?\d{3}[ -]?\d{2}[ -]?\d{2})/,
                    'email': /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    'name': /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšśžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŚŽ∂ð ,.'-]+$/
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

        },

        /* -------------------- PUBLIC METHODS -------------------- */

        /* ------ Form data ------ */

        /**
         * @return {boolean}
         */
        SendData: function (options) {
            var status = {success: false, message: 'SendData: Error (Default)'};

            var defaults = {
                url: this.settings.api.url,
                api_custom: this.settings.api.custom,
                data: this.popup.form.serialize(),
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

            //find all input in form
            //var input = this.popup.form.find(input_all_mask);

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

        /*
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                var instance = new Plugin(this, options);
                $.data(this, "plugin_" +
                    pluginName, instance);
            }
        });
        */
    };

    /*
    $.fn.swyftCallback = function () {
        return {
            DisableButton: function(input) {
                this.DisableButton(input);
            }
        }
    };
    */

})(jQuery, window, document);