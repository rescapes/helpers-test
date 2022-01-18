/**
 * Created by Andy Likuski on 2017.06.19
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as R from 'ramda';
import {classifyChildClassName, testState} from './componentTestHelpers.js';

const createInitialState = config => R.mergeRight({
  foo: 'boo'
}, config);
const sampleConfig = {
  bar: 'roo'
};


describe('componentTestHelpers', () => {

  test('testState', () =>
    expect(testState(createInitialState, sampleConfig)).toMatchSnapshot()
  );

  test('classifyChildClassName', () => {
    expect(classifyChildClassName('classyclass')).toEqual('.classyclass')
    expect(classifyChildClassName('classyClass')).toEqual('.classy-class')
    expect(classifyChildClassName('classy-class')).toEqual('.classy-class')
    expect(classifyChildClassName('button.classRoom.class')).toEqual('button.class-room.class')
    // Leave alone capitalized strings that seem to be component names, so enzyme can match on the name
    expect(classifyChildClassName('InteractiveSuperMapComponent')).toEqual('InteractiveSuperMapComponent')
  })
});
