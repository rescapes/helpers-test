/**
 * Created by Andy Likuski on 2020.05.06
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import {lazy, Suspense} from "react";
import R from "ramda";
import {of, task} from "folktale/concurrency/task";
import {e} from 'rescape-helpers-component';
import {composeWithMap} from 'rescape-ramda';

//https://gist.github.com/Millsky/d5d79b2468de0e6e50620388889ae98a
function processService(p) {
  return p.data;
}

const getDataFailure = data => ({
  type: "FAILURE_TYPE",
  data: "I failed"
});

const getDataCancelled = data => ({
  type: "CANCEL_ME",
  data: "I was cancelled"
});

const getDataSuccess = data => ({
  type: "SOME_TYPE",
  data
});

// F :: _ -> dispatch({t, d})
export const serviceTask = composeWithMap([
  component => {
    return {
      default: component
    };
  },

  action => () => {
    return e('span', {}, `Hey ${action.data}`);
  },

  // Pick up the data and dispatch an action to redux
  // Pattern match for each case
  data => {
    return of(data).willlMatchWith(
      R.map(asTask, {
        // Chain will return a chain so only need a task
        Cancelled: getDataCancelled,
        Resolved: getDataSuccess,
        Rejected: getDataFailure
      })
    );
  },

  // Unwrap the data and send it to process service
  p => {
    return processService(p);
  },

  // Generate a new task around a service
  () => {
    return task(resolver => {
      // Just resolve to 1 for now
      window.setTimeout(() => {
        resolver.resolve({data: 32});
      }, 2000);
    });
  }
]);

const L = lazy(() => {
  // Task -> Promise
  return serviceTask().run().promise();
});

export const LazyC = lazyComponent => {
  return e(Suspense, {fallback: e('span', {}, 'Hey...')},
    e(lazyComponent)
  );
};
