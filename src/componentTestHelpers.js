/**
 * Created by Andy Likuski on 2018.01.25
 * Copyright (c) 2018 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {act} from 'react-dom/test-utils';
import {inspect} from 'util';
import {createWaitForElement} from 'enzyme-wait';
import PropTypes from 'prop-types';
import {shallow, mount} from 'enzyme';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import {mergeDeep, reqPathThrowing, reqStrPathThrowing, mapMDeep} from 'rescape-ramda';
import * as apolloTestUtils from 'apollo-test-utils';
import ApolloClient from 'apollo-client';
import {InMemoryCache} from 'apollo-client-preset';
import {SchemaLink} from 'apollo-link-schema';
import {getClass} from 'rescape-helpers-component';
import {onError} from "apollo-link-error";
import {of} from 'folktale/concurrency/task';
import * as Result from 'folktale/result';
import {v} from 'rescape-validate';
import * as R from 'ramda';
import {Provider as ReduxProvider} from 'react-redux';
import {e} from 'rescape-helpers-component';
import {ApolloProvider} from '@apollo/react-hooks';

const middlewares = [thunk];
// Importing this way because rollup can't find it
const mockNetworkInterfaceWithSchema = apolloTestUtils.mockNetworkInterfaceWithSchema;

/**
 * Create an initial test state based on the sampleConfig for tests to use.
 * This should only be used for sample configuration, unless store functionality is being tested
 * @param {Function} createInitialState Function to accept sampleConfig and return the initialState
 * @param {Object} sampleConfig The config to give the initialState
 * @returns {Object} The initial state
 */
export const testState = (createInitialState, sampleConfig) => createInitialState(sampleConfig);

/**
 * Creates a mock store from our sample data an our initialState function
 * @param {Object} sampleUserSettings Merges in sample local settings, like those from a browser cache
 * @param {Object} initialState The initial state
 * @param {Object} sampleConfig The config to give the initialState
 * @type {function(*, *=)}
 */
export const makeSampleStore = (initialState, sampleUserSettings = {}) =>
  makeMockStore(initialState, sampleUserSettings);

/**
 * Like test state but initializes a mock store. This will probably be unneeded
 * unless the middleware is needed, such as cycle.js
 * @param {Function} createInitialState Creates the intial state from the sampleConfig
 * @param {Object} sampleConfig object for craeteInitialState
 * @param {Object} sampleUserSettings Merges in sample local settings, like those from a browser cache
 */
export const makeSampleInitialState = (createInitialState, sampleConfig, sampleUserSettings = {}) => {
  return makeSampleStore(createInitialState(sampleConfig), sampleUserSettings).getState();
};

/**
 * Simulates complete props from a container component by combining mapStateToProps, mapDispatchToProps, and props
 * that would normally passed from the container to a component
 * @param {Object} initialState The initialState
 * @param {Function} containerPropMaker 2 arity function from a container that expects a sample state and sampleOwnProps
 * and then applies the container's mapStateToProps, mapDispatchToProps, and optional mergeProps
 * @param sampleParentProps Sample props that would normally come from the parent container
 * @returns {Object|Promise} complete test props or Promise of the props if the containerPropMaker is async
 */
export const propsFromSampleStateAndContainer = (initialState, containerPropMaker, sampleParentProps = {}) =>
  containerPropMaker(initialState, sampleParentProps);

/**
 * Makes a mock store with the given state and optional sampleUserSettings. If the sampleUserSettings
 * they are merged into the state with deepMerge, so make sure the structure matches the state
 * @param {Object} state The initial redux state
 * @param {Object} sampleUserSettings Merges in sample local settings, like those from a browser cache
 * @returns {Object} A mock redux store
 */
export const makeMockStore = (state, sampleUserSettings = {}) => {
  const mockStore = configureStore(middlewares);
  // Creates a mock store that merges the initial state with local user settings.
  return mockStore(
    mergeDeep(
      state,
      sampleUserSettings
    )
  );
};

export const mockApolloClient = (schema, context) => {
  const mockNetworkInterface = mockNetworkInterfaceWithSchema({schema});

  const errorLink = onError(({graphQLErrors, response, operation}) => {
    //if (graphQLErrors) {
    //graphQLErrors.map(({message, locations, path}) =>
    //console.log(
    //  `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
    //)
    //);
    //}

  });
  const apolloCache = new InMemoryCache();
  return new ApolloClient({
    cache: apolloCache,
    link: new SchemaLink({schema, context}),
    networkInterface: mockNetworkInterface
  });
};

/**
 * Creates a mockApolloClient using makeSchema and makeSampleInitialState
 */
export const mockApolloClientWithSamples = (state, resolvedSchema) => {
  const context = {options: {dataSource: state}};
  return mockApolloClient(resolvedSchema, context);
};

// Wraps the component in a Redux store. (It no longer works to put the store in the context)
export const mountWithReduxProvider = (store, component, opts) => {
  let c;
  act(() => {
    c = mount(
      e(ReduxProvider, {store}, component),
      opts
    );
  });
  return c;
};

/**
 * Wraps a component in a graphql client and store context for Apollo/Redux testing
 * @param state
 * @param resolvedSchema
 * @param apolloClient
 * @param component
 * @return {*}
 */
export const mountWithApolloClientAndReduxProvider = (state, resolvedSchema, apolloClient, component) => {
  const store = makeSampleStore(state);
  return mountWithReduxProvider(
    store,
    e(ApolloProvider, {client: apolloClient}, component)
  );
};

/**
 * Wraps a component in a store context for Redux testing
 * @param state Sample state
 * @param config Sample config
 * @param connectedComponent Redux-connected component
 * @return {*}
 */
export const enzymeMountWithMockStore = (state, connectedComponent) => {

  const store = makeSampleStore(state);

  // shallow wrap the component, passing the Apollo client and redux store to the component and children
  // Also dive once to get passed the Apollo wrapper
  return mountWithReduxProvider(
    store,
    connectedComponent,
    {
      context: {},
      childContextTypes: {}
    }
  );
};

/**
 * Wrap a component factory with the given props in a shallow enzyme wrapper
 * @param componentFactory
 * @param props
 */
export const shallowWrap = (componentFactory, props) => {
  return shallow(
    componentFactory(props)
  );
};

/**
 * Waits for a child component with the given className to render. Useful for apollo along with Enzyme
 * 3, since Enzyme 3 doesn't keep it's wrapper synced with all DOM changes, and Apollo doesn't expose
 * any event that announces when the network status changes to 7 (loaded)
 * @param wrapper The mounted enzyme Component
 * @param componentName The component of the wrapper whose render method will render the child component
 * @param childClassName The child class name to search for periodically
 * @returns {Promise} A promise that returns the component matching childClassName or if an error
 * occurs return an Error with the message and dump of the props
 */
export const waitForChildComponentRender = (wrapper, componentName, childClassName) => {
  const component = wrapper.find(componentName);
  const childClassNameStr = `.${getClass(childClassName)}`;
  // Wait for the child component to render, which indicates that data loading completed
  const waitForChild = createWaitForElement(childClassNameStr);
  const find = component.find;
  // Override find to call update each time we poll for an update
  // Enzyme 3 doesn't stay synced with React DOM changes without update
  component.find = (...args) => {
    try {
      wrapper.update();
    } catch (e) {
      console.warn("Couldn't update wrapper. Assuming that render failed.");
      // If update failed because of a component error, just quit
    }
    // Find the component with the updated wrapper, otherwise we get the old component
    return find.apply(wrapper.find(componentName), args);
  };
  return waitForChild(component)
    .then(component => component.find(childClassNameStr).first())
    .catch(error => {
      const comp = wrapper.find(componentName);
      if (comp.length) {
        throw new Error(`${error.message}
        \n${error.stack}
        \n${comp.debug()}
        \n${inspect(comp.props().data, {depth: 3})}
      `
        );
      } else {
        throw error;
      }
    });
};

/**
 * Calls makeTestPropsFunction on a non Apollo container. This is a synchronous but wrapped in a
 * Task to match calls to apolloTestPropsTaskMaker
 * @param mapStateToProps
 * @param mapDispatchToProps
 * @return {Function} A 2 arity function called with state and props that results in a Task that
 * resolves the props
 */
export const testPropsTaskMaker = (mapStateToProps, mapDispatchToProps) =>
  // Wrap function result in a Task to match apolloTestPropsTaskMaker
  (state, props) => of(Result.Ok(makeTestPropsFunction(mapStateToProps, mapDispatchToProps)(state, props)));

/**
 * Given a task that generates parent container props and a parent component's views, and a viewName on that
 * parent component, returns the properties that are passed to that viewName. This allows us to chain properties
 * from a parent container to a parent component to a target container with the given viewName. For instance
 * if the parent container generated Apollo props like {data: {store: {foo: 1}}}} and the component's views
 * mapped props to viewName like props => ({foo: props.data.store.foo}), then the target container would
 * receive {foo: 1}
 * @param {Object} config
 * @param {Object} config.schema The Apollo schema
 * @param {Function} schemaToSamplePropsResultTaskFunction Function expecting the Apollo schema as the unary argument.
 * Returns a task that resolves to the parent container props in a Result.Ok for success or Result.Error if
 * and error occurs
 * @param parentComponentViews A function expecting props that returns an object keyed by view names
 * and valued by view props, where views are the child containers/components of the component
 * @param viewName The viewName in the parent component of the target container
 * @returns {Task} A Task to resolve the parentContainer props passed to the given viewName
 * in an Result.Ok. If anything goes wrong the task resolves with a Result.Error
 */
export const parentPropsForContainerResultTask = v(({schema}, schemaToSamplePropsResultTaskFunction, parentComponentViews, viewName) => {
    return mapMDeep(2,
      props => reqPathThrowing(['views', viewName], parentComponentViews(props)),
      schemaToSamplePropsResultTaskFunction(schema)
    );
  },
  [
    ['config', PropTypes.shape({
      schema: PropTypes.shape().isRequired
    }).isRequired],
    ['schemaToSamplePropsTaskFunction', PropTypes.func.isRequired],
    ['parentComponentViews', PropTypes.func.isRequired],
    ['viewName', PropTypes.string.isRequired]
  ],
  'parentPropsForContainerResultTask');

/**
 * Given a container's mapStateToProps and mapDispatchToProps, returns a function that accepts a sample state
 * and sample ownProps. This function may be exported by a container to help with unit tests
 * @param {Function} mapStateToProps The mapStatesToProps function of a container. It will be passed
 * sampleState and sampleOwnProps when invoked
 * @param {Function} mapDispatchToProps The mapDispatchToProps function of a container. It will be passed
 * the identity function for a fake dispatch and sampleOwnProps when invoked
 * @returns {Function} A function that expects a sample state and sample ownProps and returns a complete
 * sample props according to the functions of the container
 */
export const makeTestPropsFunction = (mapStateToProps, mapDispatchToProps) =>
  (sampleState, sampleOwnProps) => R.merge(
    mapStateToProps(sampleState, sampleOwnProps),
    mapDispatchToProps(R.identity, sampleOwnProps)
  );