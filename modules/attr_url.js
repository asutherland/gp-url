/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is gp-url.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

EXPORTED_SYMBOLS = [''];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gloda/modules/log4moz.js");

Cu.import("resource://gloda/modules/gloda.js");
Cu.import("resource://gloda/modules/everybody.js");

try {
Cu.import("resource://gpurl/modules/noun_url.js");
}
catch (ex) {
  dump(":!:!:!:!:!: " + ex.lineNumber + " " + ex);
}

const EXT_NAME = "gp-url";

let UrlAttr = {
  providerName: EXT_NAME,
  _log: null,
  _urlRegex: null,

  init: function() {
    this._log =  Log4Moz.Service.getLogger("gpurl.attr_url");
    this.defineAttributes();
  },

  defineAttributes: function() {
    this._attrUrl = Gloda.defineAttribute({
      provider: this,
      extensionName: EXT_NAME,
      attributeType: Gloda.kAttrDerived,
      attributeName: "url",
      bind: true,
      bindName: "urls",
      singular: false,
      subjectNouns: [Gloda.NOUN_MESSAGE],
      objectNoun: Gloda.lookupNoun("url"),
      parameterNoun: null,
      explanation: "%{subject} mentions URL %{object}" // localize-me
    });
    
    Gloda.defineNounAction(Gloda.lookupNoun("url"), {
      actionType: "filter", actionTarget: Gloda.NOUN_MESSAGE,
      shortName: "same url",
      makeConstraint: function(aAttrDef, aUrl) {
        return [UrlAttr._attrUrl, null,
                UrlNoun.toParamAndValue(aUrl)];
      }
    });
    Gloda.defineNounAction(Gloda.lookupNoun("url"), {
      actionType: "filter", actionTarget: Gloda.NOUN_MESSAGE,
      shortName: "same domain",
      makeConstraint: function(aAttrDef, aUrl) {
        return [UrlAttr._attrUrl, null,
                UrlNoun.toParamAndValue(aUrl.getDomainUrl())];
      }
    });
  },

  process: function gp_url_attr_process(aGlodaMessage, aMsgHdr, aMimeMsg) {
    let attrs = [];
    let seenUrls = {};
    if (aMimeMsg !== null) {
      let match;
      while ((match = UrlRegex.exec(aMimeMsg.body)) !== null) {
        
        let url = new Url(match[0]);
        
        // we get the url out again for normalization purposes
        let urlStr = urlObj.toString();
        if (!(url.id in seenUrls)) {
          seenUrls[url.id] = true;
          attrs.push([this._attrUrl.id, UrlNoun.toParamAndValue(url)]);
        }
      }
    }

    return attrs;
  },
};

UrlAttr.init();
