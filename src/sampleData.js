/**
 * Created by Andy Likuski on 2018.01.22
 * Copyright (c) 2018 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * This is a minimized amount of graphql schema configuration for testing
 */

import {addResolveFunctionsToSchema} from 'graphql-tools';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList
} from 'graphql';
import {reqPathThrowing, findOneValueByParamsThrowing} from 'rescape-ramda';
require('rescape-ramda')

const RegionType = new GraphQLObjectType({
  name: 'Region',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: {type: GraphQLString}
  }
});

// Store corresponding to what we store on the client
const StoreType = new GraphQLObjectType({
  name: 'Store',
  fields: {
    regions: {
      type: new GraphQLList(RegionType),
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
      }
    },
    region: {
      type: RegionType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
      }
    }
  }
})
// Fake Apollo Schema
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    store: {type: StoreType}
  }
});

export const sampleConfig = {
  regions: [
    {
      id: 'oakland',
      name: 'Oakland'
    }
  ]
}

/**
 * Minimum schema for testing
 * @type {GraphQLSchema}
 */
export const resolvedSchema = new GraphQLSchema({
  query: QueryType,
});
// Mutates resolvedSchema
addResolveFunctionsToSchema({schema: resolvedSchema, resolvers: {
  Store: {
    regions: (parent, params, {options: {dataSource}}) => {
      return findOneValueByParamsThrowing(params, reqPathThrowing(['regions'], dataSource))
    },
    region: (parent, params, {options: {dataSource}}) => {
      return findOneValueByParamsThrowing(params, reqPathThrowing(['regions'], dataSource))
    }
  },
  Query: {
    store(obj, args) {
      return sampleConfig
    }
  }
}});
