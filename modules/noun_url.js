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

EXPORTED_SYMBOLS = ['Url', 'UrlNoun', 'URL_REGEX_STR'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gloda/modules/log4moz.js");

Cu.import("resource://gloda/modules/gloda.js");

const LEGAL_SPECIAL_CHARS = "-$_.+!*'(),";
const LEGAL_CHARS = LEGAL_SPECIAL_CHARS + "a-zA-Z0-9";
const LEGAL_RANGE = "[" + LEGAL_CHARS + "]";
const LEGAL_DNS_CHARS = "-a-zA-Z0-9.";
const URL_REGEX_STR = (
  // protocol [1], delimeter
  "(https?)://" +
  // username[3]:password[4]@    presence:[2]
  "((?:(" + LEGAL_RANGE + "*):(" + LEGAL_RANGE + "*))?@)?" +
  // domain name[5] : port[6]
  "([" + LEGAL_DNS_CHARS + "]+)(?::([0-9]{1,5}))?/" +
  // path[7]
  "([" + LEGAL_CHARS + "/]*)" +
  // query[8]
  "(?:\\?([" + LEGAL_CHARS + "/&=]*))?");

let InternalUrlRegex = new RegExp(URL_REGEX_STR, "");

function Url(aUrlString, aID) {
  let match = InternalUrlRegex.exec(aUrlString);
  
  // commenting out things we don't care about for now... (for shame)
  this.proto = match[1];
  //this.user = match[3];
  //this.pass = match[4];
  this.domain = match[5];
  //this.port = match[6];
  this.path = match[7] ? match[7] : "";
  this.query = match[8] ? match[8] : "";

  if (aID === undefined)
    this._id = UrlNoun._mapUrl(this);
  else
    this._id = aID;
}

Url.prototype = {
  get id() { return this._id; },
  get domainStr() {
    return this.proto + "://" + this.domain + "/";
  },
  get pathStr() {
    return this.proto + "://" + this.domain + "/" + this.path;
  },
  get queryStr() {
    return this.proto + "://" + this.domain + "/" + this.path + "?" + this.query;
  },
  
  get domainUrl() {
    return new Url(this.domainStr);
  },
  
  toString: function () {
    if (this.query)
      return this.queryStr;
    else
      return this.pathStr; // handles path being empty...
  }
};

const DOMAIN_MULT = 4294967296;
const PATH_MULT = 65536;
const QUERY_MULT = 1;

let UrlNoun = {
  name: "url",
  class: Url,
  allowsArbitraryAttrs: false,

  init: function() {
    this._tableUrl = Gloda.defineTable({
      name: 'url',
      columns: [['id', 'INTEGER PRIMARY KEY'],
                ['url', 'TEXT']],
      indices: {url: ['url']}
    });
    
    this._highId = this._tableUrl.getHighId();
  },

  /**
   * Our encoding is thus:
   * ? protocol: for now, 
   * - domain name: 2 bytes
   * ? domain name, top level and second/extra... someday?
   * - path: 2 bytes
   * - query: 2 bytes
   */
  _mapUrl: function (aUrl) {
    let domainUrl = aUrl.domainStr;
    let domainId = this._dbLookupIdByUrl(domainUrl);
    if (domainId === null) {
      domainId = this._highId = (this._highId - (this._highId % DOMAIN_MULT)) +
                                DOMAIN_MULT;
      this._tableUrl.insert({id: domainId, url: domainUrl});
    }
    
    if (!aUrl.path)
      return domainId;
    
    let pathUrl = aUrl.pathStr;
    let pathId = this._dbLookupIdByUrl(pathUrl);
    if (pathId === null) {
      pathId = this._tableUrl.getHighId(domainId + DOMAIN_MULT - 1);
      if (pathId > 0)
        pathId = (pathId - (pathId % PATH_MULT)) + PATH_MULT;
      else
        pathId = domainId + PATH_MULT;
      this._tableUrl.insert({id: pathId, url: pathUrl});
    }
    
    if (!aUrl.query)
      return pathId;
    
    let queryUrl = aUrl.queryStr;
    let queryId = this._dbLookupIdByUrl(queryUrl);
    if (queryId === null) {
      queryId = this._tableUrl.getHighId(pathId + PATH_MULT - 1);
      if (queryId > 0)
        queryId++;
      else
        queryId = pathId + QUERY_MULT;
    }
    return queryId;
  },
  
  _dbLookupIdByUrl: function(aUrl) {
    let row = this._tableUrl.selectOne('url', aUrl);
    if (row)
      return row.id;
    return null;
  },
  
  _dbLookupById: function(aID) {
    let row = this._tableUrl.selectOne('id', aID);
    if (row)
      return row;
    return null;
  },

  toParamAndValue: function gp_url_noun_toAttributeValue(aUrl) {
    return [null, aUrl.id];
  },
  
  fromParamAndValue: function gp_url_noun_fromAttributeValue(aIgnoredParam,
                                                             aUrlId) {
    let row = this._dbLookupById(aUrlId);
    
    if (row === null) {
      dump("Unable to locate Url with id: " + aUrlId + "\n");
      return null;
    }
    
    return new Url(row.url, row.id);
  },
};


UrlNoun.init();
Gloda.defineNoun(UrlNoun);
