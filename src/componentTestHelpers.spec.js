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
import {
  makeMockStore,
  makeSampleInitialState,
  propsFromSampleStateAndContainer,
  testState
} from './componentTestHelpers';

const createInitialState = config => R.merge({
  foo: 'boo'
}, config);
const sampleConfig = {
  bar: 'roo'
};


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

  /*
test('enzymeMountWithApolloClientAndReduxProvider', async done => {
  TODO fix remote schema task or change this
  const query = gql`
      query regions {
          regions {
              id
              name
          }
      }
  `;

  class Component extends React.Component {
    render() {
      return e('div');
    }
  }

  const {schema, apolloClient} = await remoteSchemaTask(localTestConfig).run().promise();
  // Wrap the component in apollo
  const ContainerWithData = graphql(query)(Component);
  // Instantiate
  const wrapper = mountWithApolloClient(
    {apolloClient},
    e(ContainerWithData, {})
  );
  // Expect the apollo data prop, the redux dispatch, and the someProp we added
  expect(R.keys(wrapper.find(Component).props()).sort()).toEqual(['data']);
  done();
  }, 20000);
   */
});
