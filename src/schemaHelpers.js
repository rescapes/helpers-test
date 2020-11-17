/**
 * Created by Andy Likuski on 2019.08.08
 * Copyright (c) 2019 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as R from 'ramda';
import {remoteLinkedSchemaTask, remoteSchemaTask} from '@rescapes/apollo';


/**
 * Creates a remote schema and adds resolvers with the given unary function expecting the schema
 * @param config
 * @param addResolvers
 * @returns {Task}
 */
export const resolvedRemoteSchemaTask = config => remoteLinkedSchemaTask(config);
/**
 * Returns a
 * @param config
 * @returns {Task<Object>} Resolves to an apolloClient
 */
export const remoteApolloClientTask = config => R.map(
  ({apolloClient}) => apolloClient,
  remoteSchemaTask(config)
);
