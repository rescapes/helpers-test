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

import {gql} from 'apollo-client-preset';
import {graphql} from 'react-apollo';
import {connect} from 'react-redux';
import * as R from 'ramda';
import {eMap} from './componentHelpers';
import React from 'react';
import {addResolveFunctionsToSchema} from 'graphql-tools';
import {
  makeMockStore, makeSampleInitialState, propsFromSampleStateAndContainer, testState,
  wrapWithMockGraphqlAndStore
} from 'componentTestHelpers';
import {resolvedSchema} from 'sampleData';
const [div] = eMap(['div']);
const createInitialState = config => R.merge({
  foo: 'boo'
}, config)
const sampleConfig = {
  bar: 'roo'
}
addResolveFunctionsToSchema({schema: resolvedSchema, resolvers: {}})


describe('componentTestHelpers', () => {

  test('testState', () =>
    expect(testState(createInitialState, sampleConfig)).toMatchSnapshot()
  );

  test('propsFromSampleStateAndContainer', () => {
    const initialState = makeSampleInitialState(createInitialState, sampleConfig);

    // propsFromSampleStateAndContainer should take a function that merges processes
    // state and ownProps based on a container's
    // mapStateToProps, mapDispatchToProps, and mergeProps.
    // This function alweays uses makeSampleInitialState as the state and accepts
    // sample ownProps from the test
    expect(propsFromSampleStateAndContainer(
      initialState,
      // Simply merge a fake dispatch result with the sampleOwnProps
      (sampleInitialState, sampleOwnProps) => R.mergeAll([sampleInitialState, {someAction: R.identity}, sampleOwnProps]),
      // our sample ownProps
      {sample: 'own props'}))
      .toEqual(
        R.mergeAll([
          {someAction: R.identity},
          initialState,
          {sample: 'own props'}
        ])
      );
  });

  test('makeMockStore', () => {
    const config = {
      users: [{user: 'joe'}],
      regions: [{region: 'alberta'}],
      settings: {go: 'west'}
    };
    expect(makeMockStore(config).getState()).toEqual(config);
  });

  test('wrapWithMockGraphqlAndStore', () => {
    const parentProps = {};
    const query = gql`
        query region {
            store {
                regions {
                    id
                    name
                }
            }
        }
    `;

    class Component extends React.Component {
      render() {
        return div();
      }
    }

    // Wrap the component in apollo
    const ContainerWithData = graphql(query)(Component);
    // Wrap the component in redux
    const Container = connect(
      (state, props) => ({someProp: 1})
    )(ContainerWithData);
    // Create a factory for container
    const [container] = eMap([Container]);
    // Instantiate
    const wrapper = wrapWithMockGraphqlAndStore(createInitialState(sampleConfig), resolvedSchema, container(parentProps));
    // Expect the apollo data prop, the redux dispatch, and the someProp we added
    expect(R.keys(wrapper.find(Component).props()).sort()).toEqual(['data', 'dispatch', 'someProp'])
  });
});

