/**
 * Created by Andy Likuski on 2017.12.26
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


import {
  makeTestPropsFunction,
  mockApolloClientWithSamples, waitForChildComponentRender, enzymeMountWithMockGraphqlAndStore
} from './componentTestHelpers';
import {getClass} from 'rescape-helpers-component';
import PropTypes from 'prop-types';
import {v} from 'rescape-validate';
import {of, fromPromised} from 'folktale/concurrency/task';
import {
  defaultRunConfig,
  promiseToTask,
  reqPathThrowing,
  reqStrPathThrowing,
  chainMDeep,
  mergeDeep
} from 'rescape-ramda';
import {gql} from 'apollo-client-preset';
import * as R from 'ramda';
import Result from 'folktale/result';
import {loadingCompleteStatus} from 'rescape-helpers-component';
import {authClientOrLoginTask} from 'rescape-apollo';
import {graphql} from 'graphql';
import {loggers} from 'rescape-log';
const log = loggers.get('rescapeDefault');
import { print } from 'graphql/language/printer'

/**
 * Runs tests on an apollo React container with the * given config.
 * Even if the container being tested does not have an apollo query, this can be used
 * @param {Object} config
 * @param {Object} config.container The React container to test
 * @param {String} config.componentName The name of the React component that the container wraps
 * @param {String} config.childClassDataName A class used in a React component in the named
 * component's renderData method--or any render code when apollo data is loaded
 * @param {Object|Task} config.schema A graphql schema or Task resolving to a schema that resolves queries to sample
 * values. For local schemas the resolved values should be based on the Redux initial state or something similar
 * @param {Object} config.initialState The initial Redux state.
 * @param {Function} mapStateToProps Container function that expects state and props
 * @param {String} [config.childClassLoadingName] Optional. A class used in a React component in the named
 * component's renderLoading method--or any render code called when apollo loading is true. Normally
 * only needed for components with queries.
 * @param {String} [config.childClassErrorName] Optional. A class used in a React component in the named
 * component's renderError method--or any render code called when apollo error is true. Normally only
 * needed for components with queries.
 * @param {Function} [config.chainedParentPropsTask] A Task that resolves to all properties needed by the container.
 * The value must be an Result in case errors occur during loading parent data. An Result.Ok contains
 * successful props and Result.Error indicates an error that causes this function to throw
 * This can be done with constants, or as the name suggests by chaining all ancestor Components/Container props,
 * where the ancestor Container props might be Apollo based.
 * of the parentProps used to call propsFromSampleStateAndContainer. Required if the container component receives
 * props from its parent (it usually does)
 * @param {Object} [queryConfig] Optional Object that has a query property, a string representing the graphql query and
 * an args.options function that expects props and resolves to an object with a variables property which holds an
 * object of query variables. Example:
 * queryConfig =
 query: some query string
 args: {
      // options is a function that expects props an returns a vasriable object with variable key/values
      options: ({data: {region}}) => ({
        variables: {
          regionId: region.id
        },
      }),
      // Resolves the props to give to the Component. data is the query result and ownProps comes from mapStateToProps
      props: ({data, ownProps}) => mergeDeep(
        ownProps,
        {data}
      )
    }
 }
 * @param {Function} [config.errorMaker] Optional unary function that expects the results of the
 * parentProps and mutates something used by the queryVariables to make the query fail. This
 * is for testing the renderError part of the component. Only containers with queries should have an expected error state
 */
export const apolloContainerTests = v((config) => {

    const {
      Container,
      componentName,
      childClassDataName,
      // Required. The resolved schema used by Apollo to resolve data. This should be based on the Redux initial state or something similar
      // This can also be a Task that resolves to a resolved schema, which is useful for remote schemas
      schema,
      mapStateToProps,
      // Optional, the class name if the component has an Apollo-based loading state
      childClassLoadingName,
      // Optional, the class name if the component has an Apollo-based error state
      childClassErrorName,
      // Optional, A Task that resolves props all the way up the hierarchy chain, ending with props for this
      // Container based on the ancestor Containers/Components
      chainedParentPropsTask = of({}),
      // Optional, required if there are chainedParentPropsTask
      initialState,
      // Optional. Only for components with queries and/or mutations
      queryConfig,
      errorMaker
    } = config;

    // Run this apollo query
    const query = queryConfig && gql`${queryConfig.query}`;
    // Use these query variables to call the function at queryConfig.arg.options, and then get the .variables of
    // the returned value
    const createQueryVariables = props => reqStrPathThrowing('variables', reqStrPathThrowing('args.options', queryConfig)(props));
    // Wrap schema in a task if it isn't one
    // TODO how do you check is Task?
    const schemaTask = R.unless(R.prop('run'), of)(schema);

    // Resolve the Result to the Result.ok value or throw if Result.Error
    // chainedParentPropsTask returns and Result so that the an error
    // in the query can be processed by detected a Result.Error value, but here
    // we only accept a Result.Ok
    const parentPropsTask = chainedParentPropsTask.chain(result => result
      .map(props => of(props))
      .mapError(error => {
        // Unacceptable!
        if (R.is(Object, error)) {
          // GraphQL error(s)
          const errors = R.propOr([], 'error', error);
          R.forEach(error => {
            console.error(error);
            if (R.equals(error, R.last(errors)))
            // throw the last error to quit, at least we logged all of them first
              throw error;
          }, errors);

        }
        throw error;
      }).unsafeGet()
    );

    /***
     * Tests that mapStateToProps matches snapshot
     * @return {Promise<void>}
     */
    const testMapStateToProps = done => {
      // Get the test props for RegionContainer
      parentPropsTask.run().listen(
        defaultRunConfig({
          onResolved: parentProps => {
            expect(mapStateToProps(initialState, parentProps)).toMatchSnapshot();
            done();
          }
        })
      );
    };

    /**
     * For Apollo Containers with queries, tests that the query results match the snapshot
     * @return {Promise<void>}
     */
    const testQuery = done => {
      const errors = [];
      if (!query || !createQueryVariables) {
        console.warn("Attempt to run testQuery when query or queryVariables was not specified. Does your component actually need this test?");
        return;
      }

      // Task Object -> Task
      const task = R.composeK(
        ({query, initialState, mappedProps, schema}) => {
          const queryVariables = createQueryVariables(mappedProps);
          log.debug(print(query));
          log.debug(JSON.stringify(queryVariables));
          return fromPromised(
            () => mockApolloClientWithSamples(initialState, schema).query({
              query,
              // queryVariables are called with props to give us the variables for our query. This is just like Apollo
              // does, accepting props to allow the Container to form the variables for the query
              variables: queryVariables,
              // Our context is initialState as our dataSource. In real environments Apollo would go to a remote server
              // to fetch the data, but here our database is simply the initialState for testing purposes
              // This works in conjunction with the local resolvers on the schema see schema.sample.js for an example
              // If testing with a remote linked schema this will be ignored
              context: {
                dataSource: initialState
              }
            })
          )();
        },
        // Resolve the schema
        ({query, initialState, mappedProps}) => R.map(
          schema => ({query, initialState, mappedProps, schema}),
          schemaTask
        ),
        // Resolve the parent props and map using initialState
        ({query, initialState}) => R.map(
          props => ({query, initialState, mappedProps: mapStateToProps(initialState, props)}),
          parentPropsTask
        )
      )({query, initialState});

      task.run().listen(
        defaultRunConfig({
          onResolved: data => {
            // If we resolve the task, make sure there is no data.error
            if (data.error)
              throw data.error;
            expect(data).toMatchSnapshot();
          }
        }, errors, done)
      );
    };

    /**
     * Tests that the correct child class renders and that the child component props match the snapshot
     * @param done
     * @return {Promise<void>}
     */
    const testRender = done => {
      const errors = [];
      R.composeK(
        ({props, schema}) => {
          // Wrap the component in mock Apollo and Redux providers.
          // If the component doesn't use Apollo it just means that it will render its children synchronously,
          // rather than asynchronously
          const wrapper = enzymeMountWithMockGraphqlAndStore(initialState, schema, Container(props));
          // Find the top-level component. This is always rendered in any Apollo status (loading, error, store data)
          const component = wrapper.find(componentName);
          // Make sure the component props are consistent since the last test run
          expect(component.props()).toMatchSnapshot();

          // If we have an Apollo component, our immediate status after mounting the component is loading. Confirm
          if (childClassLoadingName) {
            expect(component.find(`.${getClass(childClassLoadingName)}`).length).toEqual(1);
          }

          // If we have an Apollo component, we use enzyme-wait to await the query to run and the the child
          // component that is dependent on the query result to render. If we don't have an Apollo component,
          // this child will be rendered immediately without delay
          return promiseToTask(waitForChildComponentRender(wrapper, componentName, childClassDataName));
        },
        // Resolve the schema
        props => R.map(
          schema => ({props, schema}),
          schemaTask
        ),
        () => parentPropsTask
      )().run().listen(
        defaultRunConfig({
          onResolved: childComponent => {
            expect(childComponent.props()).toMatchSnapshot();
          }
        }, errors, done)
      );
    };

    /**
     * For components with an error state, tests that the error component renders
     * @param done
     * @return {Promise<void>}
     */
    const testRenderError = (done) => {
      const errors = [];
      if (!errorMaker || !childClassErrorName) {
        console.warn("One or both of errorMaker and childClassErrorName not specified, does your component actually need to test render errors?");
        return;
      }
      R.composeK(
        ({props, schema}) => {
          const wrapper = enzymeMountWithMockGraphqlAndStore(initialState, schema, Container(props));
          const component = wrapper.find(componentName);
          expect(component.find(`.${getClass(childClassLoadingName)}`).length).toEqual(1);
          expect(component.props()).toMatchSnapshot();
          return promiseToTask(waitForChildComponentRender(wrapper, componentName, childClassErrorName));
        },
        ({props, schema}) => of({props: errorMaker(props), schema}),
        // Resolve the schema
        props => R.map(
          schema => ({props, schema}),
          schemaTask
        ),
        () => parentPropsTask
      )().run().listen(
        defaultRunConfig({
          // The error component should have an error message as props.children
          onResolved: childComponent => {
            expect(R.prop('children', childComponent.props())).toBeTruthy();
          }
        }, errors, done)
      );
    };

    return {
      testMapStateToProps,
      testQuery,
      testRenderError,
      testRender
    };
  },
  [
    ['config', PropTypes.shape({
        initialState: PropTypes.shape().isRequired,
        Container: PropTypes.func.isRequired,
        componentName: PropTypes.string.isRequired,
        childClassDataName: PropTypes.string.isRequired,
        schema: PropTypes.shape().isRequired,
        childClassLoadingName: PropTypes.string,
        childClassErrorName: PropTypes.string,
        samplePropsMaker: PropTypes.func,
        asyncParentProps: PropTypes.func,
        query: PropTypes.shape(),
        queryVariables: PropTypes.func,
        errorMaker: PropTypes.func
      }
    )]
  ], 'apolloContainerTests');


/**
 * Like makeTestPropsFunction, but additionally resolves an Apollo query to supply complete data for a test
 * @param {Object} resolvedSchema Apollo schema with resolvers
 * @param {Object} sampleConfig This is used as a datasource for the resolvers
 * @param {Function} mapStateToProps Redux container function
 * @param {Function} mapDispatchToProps Redux container function
 * @param {Function} mergeProps Redux container function
 * @query {String} query Contains an apollo query string (not gql string)
 * @args {Function} args Contains an apollo query args in the format:
 * {
 *  options: { variables: { query args } }
 * }
 *
 * @returns {Function} A function with two arguments, initialState and ownProps
 *  The function returns a Task that resolves to Result.Error or Right. If Left there are errors in the Result.value. If
 *  Right then the value is the Apollo 'store' key
 */
export const makeApolloTestPropsTaskFunction = R.curry((resolvedSchema, sampleConfig, mapStateToProps, mapDispatchToProps, {query, args}) => {

  // composeK executes from right to left (bottom to top)
  return (state, props) => R.composeK(
    // Any Left will remain Left.
    // If the Right contains an error, make a Left with the error
    // Otherwise merge the results to simulate an Apollo Client return, with the results under the 'data' key
    // The results will have a store key with the loaded data
    result => of(result.chain(({props, value: {data, errors}}) => {
      if (errors)
        return Result.Error({
          error: errors
        });
      return Result.Ok(
        mergeDeep(
          props,
          {
            data: R.merge(
              // Simulate loading complete
              loadingCompleteStatus,
              data
            )
          }
        )
      );
    })),
    // Next take the merged props and call the graphql query.
    // Convert the function returning a promise to a Task
    // If if anything goes wrong wrap it in a Left. Otherwise put it in a Right
    props => {
      return fromPromised(() => graphql(
        resolvedSchema,
        query, {},
        // Resolve graphql queries with the sampleConfig. Local resolvers rely on this value. See schema.sample.js
        // for an example. For a remote linked schema this is ignored
        {options: {dataSource: sampleConfig}},
        // Add data and ownProps since that is what Apollo query arguments props functions expect
        reqPathThrowing(['variables'], args.options(props))
        ).then(value => Result.Ok({value, props})
        ).catch(e => {
          return Result.Error({
            errors: [e]
          });
        })
      )();
    },
    // First create a function that expects state and props and uses them to call mapStateToProps and mapDispatchToProps
    // and merges the result. We wrap it in a task to give asynchronous function above
    (state, props) => of(makeTestPropsFunction(mapStateToProps, mapDispatchToProps)(state, props))
  )(state, props);
});

/**
 * Given a Task to fetch parent container props and a task to fetch the current container props,
 * Fetches the parent props and then samplePropsTaskMaker with the initial state and parent props
 * @param {Object} initialState The initial state is used by samplePropsTaskMaker to create sample props
 *
 * @param {Task} chainedParentPropsTask Task that resolves to the parent container props in a Result.Ok
 * @param {Function} samplePropsTaskMaker 2 arity function expecting state and parent props.
 * Returns a Task from a container that expects a sample state and sampleOwnProps
 * and then applies the container's mapStateToProps, mapDispatchToProps, and optional mergeProps. Note
 * that this should return a Result.Ok, just an unwrapped object
 * @returns {Task} A Task to asynchronously return the parentContainer props merged with sampleOwnProps
 * in an Result.Ok. If anything goes wrong an Result.Error is returned
 */
export const propsFromParentPropsTask = v((initialState, chainedParentPropsTask, samplePropsTaskMaker) =>
    chainMDeep(2,
      // Chain the Result.Ok value to a Task combine the parent props with the props maker
      // Task Result.Ok -> Task Object
      parentContainerSampleProps => samplePropsTaskMaker(initialState, parentContainerSampleProps),
      chainedParentPropsTask
    ),
  [
    ['initialState', PropTypes.shape().isRequired],
    ['chainedParentPropsTask', PropTypes.shape().isRequired],
    ['samplePropsTaskMaker', PropTypes.func.isRequired]
  ],
  'propsFromParentPropsTask'
);


