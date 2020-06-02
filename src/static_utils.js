/**
 * Static functions on mwn
 * rawRequest() is also a static method but is defined in bot.js itself.
 */


var rawurlencode = function( str ) {
	return encodeURIComponent( String( str ) )
		.replace( /!/g, '%21' ).replace( /'/g, '%27' ).replace( /\(/g, '%28' )
		.replace( /\)/g, '%29' ).replace( /\*/g, '%2A' ).replace( /~/g, '%7E' );
};

var isIPv4Address = function( address, allowBlock ) {
	var block,
		RE_IP_BYTE = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|0?[0-9]?[0-9])',
		RE_IP_ADD = '(?:' + RE_IP_BYTE + '\\.){3}' + RE_IP_BYTE;
	if ( typeof address !== 'string' ) {
		return false;
	}
	block = allowBlock ? '(?:\\/(?:3[0-2]|[12]?\\d))?' : '';
	return ( new RegExp( '^' + RE_IP_ADD + block + '$' ).test( address ) );
};

var isIPv6Address = function( address, allowBlock ) {
	var block, RE_IPV6_ADD;
	if ( typeof address !== 'string' ) {
		return false;
	}
	block = allowBlock ? '(?:\\/(?:12[0-8]|1[01][0-9]|[1-9]?\\d))?' : '';
	RE_IPV6_ADD =
		'(?:' + // starts with "::" (including "::")
			':(?::|(?::' +
				'[0-9A-Fa-f]{1,4}' +
			'){1,7})' +
			'|' + // ends with "::" (except "::")
			'[0-9A-Fa-f]{1,4}' +
			'(?::' +
				'[0-9A-Fa-f]{1,4}' +
			'){0,6}::' +
			'|' + // contains no "::"
			'[0-9A-Fa-f]{1,4}' +
			'(?::' +
				'[0-9A-Fa-f]{1,4}' +
			'){7}' +
		')';
	if ( new RegExp( '^' + RE_IPV6_ADD + block + '$' ).test( address ) ) {
		return true;
	}
	// contains one "::" in the middle (single '::' check below)
	RE_IPV6_ADD =
		'[0-9A-Fa-f]{1,4}' +
		'(?:::?' +
			'[0-9A-Fa-f]{1,4}' +
		'){1,6}';
	return (
		new RegExp( '^' + RE_IPV6_ADD + block + '$' ).test( address ) &&
		/::/.test( address ) &&
		!/::.*::/.test( address )
	);
};

module.exports = {

	/**
	 * Get wikitext for a new link
	 * @param {string|bot.title} target
	 * @param {string} [displaytext]
	 */
	link: function(target, displaytext) {
		if (typeof target.toText === 'function') {
			return '[[' + target.toText() +
				(target.fragment ? '#' + target.fragment : '') +
				(displaytext ? '|' + displaytext : '') +
				']]';
		}
		return '[[' + target + (displaytext ? '|' + displaytext : '') + ']]';
	},

	/**
	 * Get wikitext for a template usage
	 * @param {string|bot.title} title
	 * @param {Object} [parameters] - template parameters as object
	 */
	template: function(title, parameters) {
		if (typeof title.toText === 'function') {
			if (title.namespace === 10) {
				title = title.getMainText(); // skip namespace name for templates
			} else if (title.namespace === 0) {
				title = ':' + title.toText(); // prefix colon for mainspace
			} else {
				title = title.toText();
			}
		}
		return '{{' + title +
			Object.entries(parameters).map(([key, val]) => {
				return '|' + key + '=' + val;
			}).join('') +
			'}}';
	},

	table: class table {
		/**
		 * @param {Object} [config={}]
		 * @config {boolean} plain - plain table without borders
		 * @config {boolean} sortable - make columns sortable
		 * @config {string} style - style attribute
		 * @config {boolean} multiline - put each cell of the table on a new line,
		 * this causes no visual changes, but the wikitext representation is different.
		 */
		constructor(config = {}) {
			var classes = [];
			if (!config.plain) {
				classes.push('wikitable');
			}
			if (config.sortable) {
				classes.push('sortable');
			}
			if (config.multiline) {
				this.multiline = true;
			}
			this.text = `{|`;
			if (classes.length) {
				this.text += ` class="${classes.join(' ')}"`;
			}
			if (config.style) {
				this.text += ` style="${config.style}"`;
			}
			this.text += '\n';
		}
		/**
		 * Add the headers
		 * @param {string[]} headers - array of header items
		 */
		addHeaders(headers) {
			this.text += `|-\n`; // row separator
			if (this.multiline) {
				this.text += headers.map(e => `! ${e} \n`);
			} else {
				this.text += `! ` + headers.join(' !! ') + '\n';
			}
		}
		/**
		 * Add a row to the table
		 * @param {string[]} fields - array of items on the row,
		 */
		addRow(fields) {
			this.text += `|-\n`; // row separator
			if (this.multiline) {
				this.text += fields.map(e => `| ${e} \n`);
			} else {
				this.text += `| ` + fields.join(' || ') + '\n';
			}
		}
		/** @returns {string} the final table wikitext */
		getText() {
			return this.text + `|}`; // add the table closing tag and return
		}
	},

	util: {

		/**
		 * Escape string for safe inclusion in regular expression.
		 * The following characters are escaped:
		 *     \ { } ( ) | . ? * + - ^ $ [ ]
		 * @param {string} str String to escape
		 * @return {string} Escaped string
		 */
		escapeRegExp: function( str ) {
			// eslint-disable-next-line no-useless-escape
			return str.replace( /([\\{}()|.?*+\-^$\[\]])/g, '\\$1' );
		},

		/**
		 * Escape a string for HTML. Converts special characters to HTML entities.
		 *
		 *     Util.escapeHtml( '< > \' & "' );
		 *     // Returns &lt; &gt; &#039; &amp; &quot;
		 *
		 * @param {string} s - The string to escape
		 * @return {string} HTML
		 */
		escapeHtml: function( s ) {
			return s.replace( /['"<>&]/g, function escapeCallback( s ) {
				switch ( s ) {
					case '\'':
						return '&#039;';
					case '"':
						return '&quot;';
					case '<':
						return '&lt;';
					case '>':
						return '&gt;';
					case '&':
						return '&amp;';
				}
			});
		},

		/**
		 * Encode the string like PHP's rawurlencode
		 *
		 * @param {string} str String to be encoded.
		 * @return {string} Encoded string
		 */
		rawurlencode: rawurlencode,

		/**
		 * Encode page titles for use in a URL like mw.util.wikiUrlencode()
		 *
		 * We want / and : to be included as literal characters in our title URLs
		 * as they otherwise fatally break the title. The others are decoded because
		 * we can, it's prettier and matches behaviour of `wfUrlencode` in PHP.
		 *
		 * @param {string} str String to be encoded.
		 * @return {string} Encoded string
		 */
		wikiUrlencode: function( str ) {
			return rawurlencode( str )
				.replace( /%20/g, '_' )
				// wfUrlencode replacements
				.replace( /%3B/g, ';' )
				.replace( /%40/g, '@' )
				.replace( /%24/g, '$' )
				.replace( /%21/g, '!' )
				.replace( /%2A/g, '*' )
				.replace( /%28/g, '(' )
				.replace( /%29/g, ')' )
				.replace( /%2C/g, ',' )
				.replace( /%2F/g, '/' )
				.replace( /%7E/g, '~' )
				.replace( /%3A/g, ':' );
		},

		/**
		 * Check if string is an IPv4 address
		 * @param {string} address
		 * @param {boolean} [allowBlock=false]
		 * @return {boolean}
		 */
		isIPv4Address: isIPv4Address,

		/**
		 * Check if the string is an IPv6 address
		 * @param {string} address
		 * @param {boolean} [allowBlock=false]
		 * @return {boolean}
		 */
		isIPv6Address: isIPv6Address,

		/**
		 * Check whether a string is an IP address
		 * @param {string} address String to check
		 * @param {boolean} [allowBlock=false] True if a block of IPs should be allowed
		 * @return {boolean}
		 */
		isIPAddress: function( address, allowBlock ) {
			return isIPv4Address( address, allowBlock ) ||
				isIPv6Address( address, allowBlock );
		}

	}

};