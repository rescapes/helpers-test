/**
 * Created by Andy Likuski on 2017.03.03
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Make Enzyme Rx available in all test files without importing
import {shallow, render, mount} from 'enzyme';
// Enzyme setup
import enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import * as R from 'ramda'
import {JSDOM} from 'jsdom';

enzyme.configure({adapter: new Adapter()});


global.shallow = shallow;
global.render = render;
global.mount = mount;
global.navigator = {
  userAgent: 'node.js'
};

// jsdom, window, document, navigator setup
// http://airbnb.io/enzyme/docs/guides/jsdom.html
function copyProps(src, target) {
  const props = Object.getOwnPropertyNames(src)
    .filter(prop => typeof target[prop] === 'undefined')
    .reduce((result, prop) => R.merge(
      result,
      {
        [prop]: Object.getOwnPropertyDescriptor(src, prop)
      }),
      {});
  Object.defineProperties(target, props);
}

global.jsdom = new JSDOM('<!doctype html><html><body></body></html>');
const {window} = jsdom;
global.window = window;
global.document = window.document;
global.navigator = {
  userAgent: 'node.js'
};
copyProps(window, global);
window.URL = window.URL || {}
window.URL.createObjectURL = () => {}

Error.stackTraceLimit = Infinity;
// Have exceptions traces traverse async processes
if (process.env.NODE_ENV !== 'production') {
  require('longjohn');
}

class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = value.toString();
  }

  removeItem(key) {
    delete this.store[key];
  }
};

global.localStorage = new LocalStorageMock;


// In Node v7 unhandled promise rejections will terminate the process
if (!process.env.LISTENING_TO_UNHANDLED_REJECTION) {
  process.on('unhandledRejection', event => {
    console.error(event)
  })
  // Avoid memory leak by adding too many listeners
  process.env.LISTENING_TO_UNHANDLED_REJECTION = true
}