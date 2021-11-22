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

import {inspect} from 'util';
import {createWaitForElement} from 'enzyme-wait';
import PropTypes from 'prop-types';
import enzyme from 'enzyme';
import {promiseToTask, reqPathThrowing, reqStrPathThrowing} from '@rescapes/ramda';
import apolloClient from '@apollo/client';
import {e, getClass} from '@rescapes/helpers-component';
import T from 'folktale/concurrency/task';
import {
  composeWithComponentMaybeOrTaskChain,
  containerForApolloType,
  getRenderPropFunction,
  nameComponent
} from '@rescapes/apollo';
import Result from 'folktale/result';
import {v} from '@rescapes/validate';
import * as R from 'ramda';

const {of, fromPromised} = T;
const {ApolloProvider} = apolloClient;

const {mount, shallow} = enzyme;

/**
 * Create an initial test state based on the sampleConfig for tests to use.
 * This should only be used for sample configuration, unless store functionality is being tested
 * @param {Function} createInitialState Function to accept sampleConfig and return the initialState
 * @param {Object} sampleConfig The config to give the initialState
 * @returns {Object} The initial state
 */
export const testState = (createInitialState, sampleConfig) => createInitialState(sampleConfig);


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
 * Wraps a component in an Apollo Provider for testing
 * @param apolloConfig
 * @param apolloConfig.apolloClient
 * @param componentElement A React component element
 * @param props for the component
 * @return {*}
 */
export const mountWithApolloClient = v((apolloConfig, componentElement) => {
  return mount(
    e(
      ApolloProvider,
      {client: reqStrPathThrowing('apolloClient', apolloConfig)},
      componentElement
    )
  );
}, [
  ['apolloConfig', PropTypes.shape({
    apolloClient: PropTypes.shape().isRequired
  }).isRequired],
  ['component', PropTypes.shape().isRequired]
], 'mountWithApolloClient');

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

export const classifyChildClassName = childId => {
  return R.cond([
    [
      // If it starts with a capital, assume it's a component name and leave it alone
      childId => R.test(/^[A-Z]/, childId),
      R.identity
    ],
    [
      // This matches a component type followed by classes, such as button.className.className2
      //
      childId => R.includes('.', childId),
      childId => {
        const parts = R.split('.', childId);
        return R.join('.',
          R.concat(
            [R.head(parts)],
            R.map(getClass, R.tail(parts)))
        );
      }
    ],
    // Just add . to make it a class
    [
      R.T,
      childId => R.concat('.', getClass(childId))
    ]
  ])(childId);
};

/**
 * Waits for a child component with the given className to render. Useful for apollo along with Enzyme
 * 3, since Enzyme 3 doesn't keep it's wrapper synced with all DOM changes, and Apollo doesn't expose
 * any event that announces when the network status changes to 7 (loaded)
 * @param {Object} config
 * @param {String|Object|Function} config.componentId or The component name or component or anything that can be found
 * of the wrapper whose render method will render the child component. This is search for by
 * wrapper.find(componentId) and failing that wrapper.find(`[data-testid'=${componentId}`])
 * @param {String} config.childId The child class id  to search for periodically
 * @param {String} [config.alreadyChildId] A child class to check for. If it already exists,
 * skip waiting for childclassName. This is handy to look for the ready state when a component is never actually in the loading state
 * @param {Number} [config.waitLength] Default 10000 ms. Set longer for longer queries
 * @param {Object} wrapper The mounted enzyme Component
 * @returns {Task} A task that returns the component matching childId or if an error
 * occurs return an Error with the message and dump of the props
 */
export const waitForChildComponentRenderTask = v(
  ({
     componentId,
     childId,
     alreadyChildId,
     waitLength = 10000
   }, wrapper) => {

    const componentIdSearch = R.test(/^[A-Z]\S+/, componentId) ? componentId : `[data-testid='${componentId}']`;
    const alreadyChildIIdSearch = alreadyChildId && R.test(/^[A-Z]\S+/, alreadyChildId) ? alreadyChildId : `[data-testid='${alreadyChildId}']`;
    const childIdSearch = R.test(/^[A-Z]\S+/, childId) ? childId : `[data-testid='${childId}']`;
    const component = wrapper.find(componentIdSearch);
    if (!R.length(component)) {
      throw new Error(`Can't find component of id ${componentIdSearch}.`)
    }

    // If alreadyChildId already exists, return it.
    // This happens when the component never was in the loading state but went straight to the ready/data state
    if (alreadyChildId && R.length(component.find(alreadyChildIIdSearch))) {
      return of({wrapper, component, childComponent: component.find(childIdSearch).first()});
    }

    // Wait for the child component to render, which indicates that data loading completed
    const waitForChild = createWaitForElement(
      childIdSearch,
      waitLength
    );
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
      return find.apply(wrapper.find(componentIdSearch), args);
    };
    const _error = new Error()
    return promiseToTask(waitForChild(component)).map(
      component => {
        // We need to get the updated reference to the component that has all requests finished
        const updatedComponent = wrapper.find(componentIdSearch).first();
        return {wrapper, component: updatedComponent, childComponent: updatedComponent.find(childIdSearch).first()};
      }).orElse(
      error => {
        const comp = wrapper.find(componentIdSearch);
        if (comp.length) {
          const errorMessage = `${error.message}
        \n${error.stack}
        \n${comp.debug()}
        \n${inspect(comp.props().data, {depth: 3})}
      `;
          console.error(errorMessage);
          console.error(_error.stack);
          throw error
        } else {
          throw error;
        }
      });
  },
  [
    ['config', PropTypes.shape({
      componentId: PropTypes.string.isRequired,
      childId: PropTypes.string.isRequired,
      waitLength: PropTypes.number
    }).isRequired],
    ['wrapper', PropTypes.shape().isRequired]
  ], 'waitForChildComponentRenderTask');


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
 * @param {Object} apolloConfig
 * @param {Object} apolloConfig.apolloClient Client for requests
 * @param {Object} config
 * @param {Function} config.apolloConfigToSamplePropsTask Function expecting the Apollo config as the unary argument.
 * Returns a task that resolves to the parent container props in a Result.Ok for success or Result.Error if
 * and error occurs
 * @param {Function} config.parentComponentViews A function expecting props that returns an object keyed by view names
 * and valued by view props, where views are the child containers/components of the component
 * @param {Object} config.viewName The viewName in the parent component of the target container
 * @param {Object} props
 * @param {Object} props.render The render prop for component requests
 * @returns {Task|Function} A Task to resolve the parentContainer props passed to the given viewName
 * or a component function for component queries
 */
export const parentPropsForContainer = v((apolloConfig, {
    apolloConfigToSamplePropsContainer,
    parentComponentViews,
    containerName,
    viewName
  }, {render}) => {
    return composeWithComponentMaybeOrTaskChain([
      nameComponent(`parentPropsOf${containerName}View${viewName}`, props => {
        return containerForApolloType(
          apolloConfig,
          {
            render: getRenderPropFunction(props),
            response: reqPathThrowing(
              // Get the the parent component's view that renders the calling container
              ['views', viewName],
              // Leave out the parent component's key property, it was only used to key the component
              parentComponentViews(R.omit(['key'], props))
            )
          }
        );
      }),
      ({render}) => {
        return apolloConfigToSamplePropsContainer(apolloConfig, {render});
      }
    ])({render});
  },
  [
    ['apolloConfig', PropTypes.shape({
      apolloClient: PropTypes.shape()
    }).isRequired],
    ['config', PropTypes.shape({
      apolloConfigToSamplePropsContainer: PropTypes.func.isRequired,
      parentComponentViews: PropTypes.func.isRequired,
      viewName: PropTypes.string.isRequired
    }).isRequired],
    ['props', PropTypes.shape({
      render: PropTypes.func
    }).isRequired]
  ],
  'parentPropsForContainer');

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
export const makeTestPropsFunction = (mapStateToProps, mapDispatchToProps) => {
  return (sampleState, sampleOwnProps) => R.merge(
    mapStateToProps(sampleState, sampleOwnProps),
    mapDispatchToProps(R.identity, sampleOwnProps)
  );
}
