if (typeof module === 'object' && typeof define !== 'function') {
    var define = function(factory) {
        'use strict';
        module.exports = factory(require, exports, module);
    };
}

define(function(require) {
    'use strict';

    var parser = require('./mailreader-parser');
    var mailreader = {};

    mailreader.startWorker = function(path) {
        path = (typeof path !== 'undefined') ? path : './mailreader-parser-worker.js';
        mailreader.worker = new Worker(path);
    };

    mailreader.isRfc = function(string) {
        return string.indexOf('Content-Type: ') !== -1;
    };

    /**
     * Interprets an rfc block
     * @param {String} options.path The folder's path
     * @param {Number} options.message The message to append the interpreted data to
     * @param {String} options.raw the raw rfc block
     * @param {Function} callback will be called the message is parsed
     */
    mailreader.parseRfc = function(options, callback) {
        options.message.attachments = options.message.attachments || [];
        options.message.body = options.message.body || '';

        parse('parseRfc', options.raw, function(error, parsed) {
            if (error) {
                callback(error);
                return;
            }

            options.message.body = (parsed.text || '').replace(/[\r]?\n$/g, '');

            if (parsed.attachments) {
                parsed.attachments.forEach(function(attmt) {
                    options.message.attachments.push({
                        filename: attmt.generatedFileName,
                        filesize: attmt.length,
                        mimeType: attmt.contentType,
                        content: attmt.content
                    });
                });
            }

            callback(null, options.message);
        });
    };

    /**
     * Parses the text from a string representation of a mime node
     * @param {Object} options.message The message object to append the text to
     * @param {String} options.raw The string representation of a mime node
     * @param {Function} callback Will be invoked when the text was parsed
     */
    mailreader.parseText = function(options, callback) {
        options.message.body = options.message.body || '';

        parse('parseText', options.raw, function(error, text) {
            if (error) {
                callback(error);
                return;
            }

            // remove the unnecessary \n's and \r\n's at the end of the string...
            text = text.replace(/([\r]?\n)*$/g, '');

            // the mailparser parsed the content of the text node, so let's add it to the mail body
            options.message.body += text;

            callback(null, options.message);
        });
    };

    /**
     * Parses the content from a string representation of an attachment mime node
     * @param {Object} options.attachment The attachment object to append the content to
     * @param {String} options.raw The string representation of a mime node
     * @param {Function} callback Will be invoked when the text was parsed
     */
    mailreader.parseAttachment = function(options, callback) {
        parse('parseAttachment', options.raw, function(error, content) {
            if (error) {
                callback(error);
                return;
            }

            options.attachment.content = content;
            callback(null, options.attachment);
        });
    };

    function parse(method, raw, cb) {
        if (typeof window !== 'undefined' && window.Worker && !mailreader.worker) {
            throw new Error('Worker is not initialized!');
        }

        if (!mailreader.worker) {
            parser.parse(method, raw, function(parsed) {
                cb(null, parsed);
            });
            return;
        }

        mailreader.worker.onmessage = function(e) {
            cb(null, e.data);
        };

        mailreader.worker.onerror = function(e) {
            var error = new Error('Error handling web worker: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);
            console.error(error);
            cb(error);
        };

        mailreader.worker.postMessage({
            method: method,
            raw: raw
        });
    }

    return mailreader;
});