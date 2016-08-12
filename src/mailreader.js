(function(factory) {
    'use strict';

    module.exports = factory(require('./mailreader-parser'));
})(function(parser) {
    'use strict';

    var mailreader = {};

    /**
     * Interprets an rfc block
     * @param {String} options.bodyParts Body parts for parsing, as returned by https://github.com/whiteout-io/imap-client
     * @param {Function} callback will be called the message is parsed
     */
    mailreader.parse = function(options, callback) {
        parser.parse(options.bodyParts, function(parsed) {
            callback(null, parsed);
        });
    };

    return mailreader;
});
