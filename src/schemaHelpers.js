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

import {reqPathThrowing, findOneValueByParamsThrowing} from 'rescape-ramda';
import {remoteSchemaTask, remoteLinkedSchemaTask} from 'rescape-apollo';
import * as R from 'ramda';
import {addResolveFunctionsToSchema} from 'graphql-tools';

/***
 * Creates a resolved schema based on a remote schema, and not on the schema definition above
 * @param {Object} config Values that matter are settings.api.uri, the graphql uri
 * and settings.apiAuthorization = {username=..., password=...} to authenticate with graphql to fetch the schema
 * @return {Task} The resolved remote schema, which uses our resolvers defined above
 */



/**
 * Creates a remote schema and adds resolvers with the given unary function expecting the schema
 * @param config
 * @param addResolvers
 * @returns {Task}
 */
export const resolvedRemoteSchemaTask = config => remoteLinkedSchemaTask(config);
