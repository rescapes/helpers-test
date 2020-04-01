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

import {act} from 'react-dom/test-utils';
import {mountWithApolloClient, waitForChildComponentRenderTask} from './componentTestHelpers';
import {e, getClass, loadingCompleteStatus} from 'rescape-helpers-component';
import PropTypes from 'prop-types';
import {v} from 'rescape-validate';
import {fromPromised, of, waitAll} from 'folktale/concurrency/task';
import {
  chainMDeep,
  composeWithChain,
  composeWithChainMDeep,
  defaultRunConfig,
  filterWithKeys,
  mapObjToValues,
  mapToMergedResponseAndInputs,
  mapToNamedResponseAndInputs,
  mergeDeep,
  omitDeep,
  reqPathThrowing,
  reqStrPathThrowing
} from 'rescape-ramda';
import * as R from 'ramda';
import Result from 'folktale/result';
import {graphql} from 'graphql';
import {loggers} from 'rescape-log';

const log = loggers.get('rescapeDefault');

/**
 *
 * Use given props to call the function at requests.arg.options, and then get the .variables of the returned value
 * @param {Function} apolloComponent Expects props and returns an Apollo Component
 * @param {Object} props
 * @returns {Object} variables to use for the query
 */
const createRequestVariables = (apolloComponent, props) => {
  return reqStrPathThrowing('props.variables', apolloComponent(props));
};


/**
 * Processes a schemaToPropsResultTask representing parent props. props
 * Resolve the Result to the Result.ok value or throw if Result.Error
 * samplePropsResultTask returns and Result so that the an error
 * in the query can be processed by detected a Result.Error value, but here
 * we only accept a Result.Ok
 * @param {function} schemaToPropsResultTask Expects a schema and returns a Task Result.Ok|Result.Error
 * @param schemaTask
 * @return {*}
 */
const parentPropsTask = (schemaToPropsResultTask, schemaTask) => {
  return composeWithChainMDeep(1, [
    propsResult => {
      return of(propsResult.matchWith({
        Ok: ({value}) => value,
        Error: ({value: error}) => {
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
        }
      }));
    },
    schema => {
      return schemaToPropsResultTask(schema);
    },
    () => {
      return schemaTask;
    }
  ])();
};

/**
 * Runs tests on an apollo React container with the * given config.
 * Even if the container being tested does not have an apollo query, this can be used
 * @param {Object} config
 * @param {String} config.componentName The name of the React component that the container wraps
 * @param {String} config.childClassDataName A class used in a React component in the named
 * component's renderData method--or any render code when apollo data is loaded
 * @param {Object|Task} config.schema A graphql schema or Task resolving to a schema that resolves queries to sample
 * values.
 * @param {String} [config.childClassLoadingName] Optional. A class used in a React component in the named
 * component's renderLoading method--or any render code called when apollo loading is true. Normally
 * only needed for components with queries.
 * @param {String} [config.childClassErrorName] Optional. A class used in a React component in the named
 * component's renderError method--or any render code called when apollo error is true. Normally only
 * needed for components with queries.
 * @param {Function} [config.schemaToPropsResultTask] A Function that expects the Apollo schema as the unary
 * argument. Returns a task that resolves to all properties needed by the container.
 * The value must be an Result in case errors occur during loading parent data. An Result.Ok contains
 * successful props and Result.Error indicates an error that causes this function to throw
 * This can be done with constants, or as the name suggests by chaining all ancestor Components/Container props,
 * where the ancestor Container props might be Apollo based.
 * of the parentProps used to call propsFromSampleStateAndContainer. Required if the container component receives
 * props from its parent (it usually does)
 * @param {Object} [apolloContext.apolloContainers] Optional Object that has a query property, a string representing the graphql query and
 * an args.options function that expects props and resolves to an object with a variables property which holds an
 * object of query variables. Example:
 * requests =
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
 * @param {Object} testContext
 * @param {Function} [testContext.errorMaker] Optional unary function that expects the results of the
 * @param {[String]} testContext.omitKeysFromSnapshots Keys to not snapshot test because
 * values aren't deterministic. This must at least include id and should include dates that change.
 * The keys are omitted from all result objects deep prior to snapshot testing
 * @param {[String]} testContext.updatedPaths Paths to values that should change between mutations.
 * This only works for things like update date or instance version number that change every mutation.
 * @param {Object} container
 * @param {Function} schemaToPropsResultTask A function expecting the schema and resolving to the props in a Task<Result.Ok>
 * parentProps and mutates something used by the queryVariables to make the query fail. This
 * is for testing the renderError part of the component. Only containers with queries should have an expected error state
 *    {
      testMapStateToProps,
      testQueries,
      testMutations,
      testRenderError,
      testRender
    };
 */
export const apolloContainerTests = v((context, container, schemaToPropsResultTask) => {
    const {
      componentContext: {
        name: componentName,
        statusClasses: {
          data: childClassDataName,
          loading: childClassLoadingName,
          error: childClassErrorName
        }
      },
      apolloContext: {
        apolloConfigTask,
        // TODO probably not needed because of apolloConfigTask -> apolloClient
        schemaTask,
        apolloContainers
      },
      testContext: {
        errorMaker,
        omitKeysFromSnapshots,
        updatedPaths
      }
    } = context;

    // Optional, A Task that resolves props all the way up the hierarchy chain, ending with props for this
    // container based on the ancestor Containers/Components
    const resolvedPropsTask = R.map(
      props => {
        // Add the test prop which instructs our HOC instance to store the apollo component results for testing
        return R.merge(props, {_testApolloRenderProps: true});
      },
      R.ifElse(
        R.identity,
        schemaToPropsResultTask => {
          return parentPropsTask(schemaToPropsResultTask, schemaTask);
        },
        () => of({})
      )(schemaToPropsResultTask)
    );

    // Run these apollo queries
    const queryComponents = filterWithKeys(
      (_, key) => {
        return R.includes('query', key);
      },
      apolloContainers
    );
    // Run these apollo mutations
    const mutationComponents = filterWithKeys(
      (_, key) => {
        return R.includes('mutat', key);
      },
      apolloContainers
    );

    /**
     * Tests that we can mount the composed request container
     * @param done
     */
    const testComposeRequests = done => {
      expect.assertions(1);
      const errors = [];
      composeWithChain([
        mapToMergedResponseAndInputs(
          // Resolves to {schema, apolloClient}
          () => schemaTask
        ),
        mapToNamedResponseAndInputs('props',
          () => resolvedPropsTask
        )
      ])({}).run().listen(
        defaultRunConfig({
          onResolved: ({props, apolloClient}) => {
            const component = mountWithApolloClient(
              {apolloClient},
              e(container, props)
            );
            expect(component).toBeTruthy();
          }
        }, errors, done)
      );
    };


    /**
     * For Apollo Containers with queries, tests that the query results match the snapshot
     */
    const testQueries = done => _testQueries(
      {
        schemaTask,
        resolvedPropsTask,
        omitKeysFromSnapshots
      },
      queryComponents,
      done
    );

    /**
     * For Apollo Containers with mutations, tests that the mutation results match the snapshot
     */
    const testMutations = done => _testMutations(
      {
        schemaTask,
        resolvedPropsTask,
        omitKeysFromSnapshots
      },
      mutationComponents,
      done
    );

    /**
     * Tests that the correct child class renders and that the child component props match the snapshot
     * @param done
     * @return {Promise<void>}
     */
    const testRender = done => {
      _testRender(
        {
          schemaTask,
          resolvedPropsTask,
          componentName,
          childClassDataName,
          childClassLoadingName,
          omitKeysFromSnapshots,
          mutationComponents,
          updatedPaths
        },
        container,
        done);
    };

    /**
     * For components with an error state, tests that the error component renders
     * @param done
     * @return {Promise<void>}
     */
    const testRenderError = done => {
      _testRenderError({
        schemaTask,
        resolvedPropsTask,
        componentName,
        childClassDataName,
        childClassErrorName,
        childClassLoadingName,
        errorMaker
      }, container, done);
    };

    return {
      testComposeRequests,
      testQueries,
      testMutations,
      testRenderError,
      testRender
    };
  },
  [
    ['config', PropTypes.shape({
        componentContext: PropTypes.shape({
          name: PropTypes.string.isRequired,
          statusClasses: PropTypes.shape({
            data: PropTypes.string.isRequired,
            loading: PropTypes.string,
            error: PropTypes.string
          })
        }),
        apolloContext: PropTypes.shape({
          schemaTask: PropTypes.shape().isRequired,
          requests: PropTypes.shape()
        }),
        testContext: PropTypes.shape({
          errorMaker: PropTypes.func
        })
      }
    )],
    [
      'container', PropTypes.func.isRequired
    ],
    [
      'propsResultTask', PropTypes.func.isRequired
    ]
  ], 'apolloContainerTests');


/**
 * TODO I don't think this is needed anymore
 * Like makeTestPropsFunction, but additionally resolves an Apollo query to supply complete data for a test
 * @param {Object} schemaOrTask Apollo schema with resolvers or a remote schema task
 * @param {Object} sampleConfig This is used as a datasource for the resolvers
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
export const makeApolloTestPropsTaskFunction = R.curry((schemaOrTask, sampleConfig, {query, args}) => {

  return props => R.composeK(
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
    ({schema, props}) => {
      return fromPromised(() => graphql(
        schema,
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

    // Get the schema
    ({schemaOrTask, props}) => R.map(
      schema => ({schema, props}),
      (R.unless(R.prop('run'), of)(schemaOrTask))
    )
  )({schemaOrTask, props});
});

/**
 * Runs the apollo queries in queryComponents
 * @param schemaTask
 * @param resolvedPropsTask
 * @param {Function} queryComponents
 * @return {*}
 * @private
 */
const _apolloQueryResponsesTask = ({schemaTask, resolvedPropsTask}, queryComponents) => {
  // Task Object -> Task
  return composeWithChainMDeep(1, [
    // Wait for all the queries to finish
    ({queryComponents, mappedProps, apolloClient}) => {
      return waitAll(
        mapObjToValues(
          query => {
            // Create variables for the current graphqlQueryObj by sending props to its configuration
            // Add a render function that returns null to prevent react from complaining
            // Normally the render function creates the child components, passing the Apollo request results as props
            const props = R.merge(mappedProps, {render: props => null});
            const queryVariables = createRequestVariables(query, props);
            log.debug(JSON.stringify(queryVariables));
            const task = fromPromised(
              () => {
                return apolloClient.query({
                  // pass props the query so we can get the Query component and extract the query string
                  query: reqStrPathThrowing('props.query', query(props)),
                  // queryVariables are called with props to give us the variables for our query. This is just like Apollo
                  // does, accepting props to allow the container to form the variables for the query
                  variables: queryVariables
                });
              }
            )();
            return task;
          },
          queryComponents
        )
      );
    },
    // Resolve the schemaTask
    mapToMergedResponseAndInputs(
      ({}) => {
        return schemaTask;
      }
    ),
    // Resolve the parent props and map using initialState
    // TODO this used to be here for Redux
    mapToNamedResponseAndInputs('mappedProps',
      ({props}) => {
        return of(props);
      }
    ),
    // Resolve the props from the task
    mapToNamedResponseAndInputs('props',
      () => {
        return resolvedPropsTask;
      }
    )
  ])({schemaTask, resolvedPropsTask, queryComponents});
};

/**
 * Runs an apollo queries test and asserts results
 * @param schemaTask
 * @param resolvedPropsTask
 * @param mapStateToProps
 * @param queryComponents
 * @param done
 * @return {Promise<void>}
 * @private
 */
const _testQueries = (
  {
    schemaTask,
    resolvedPropsTask,
    omitKeysFromSnapshots
  },
  queryComponents,
  done
) => {
  expect.assertions(1);
  const errors = [];
  if (!queryComponents) {
    console.warn("Attempt to run testQuery when query or queryVariables was not specified. Does your component actually need this test?");
    return;
  }
  const apolloQueryResponsesTask = _apolloQueryResponsesTask({
    schemaTask,
    resolvedPropsTask
  }, queryComponents);
  apolloQueryResponsesTask.run().listen(
    defaultRunConfig({
      onResolved: dataSets => {
        // If we resolve the task, make sure there is no data.error
        R.forEach(
          data => {
            if (data.error)
              errors.push(data.error);
          },
          dataSets
        );
        expect(R.map(
          dataSet => {
            return omitDeep(omitKeysFromSnapshots, dataSet);
          },
          dataSets
        )).toMatchSnapshot();
      }
    }, errors, done)
  );
};


/**
 * Runs the apollo mutations in mutationComponents
 * @param schemaTask
 * @param resolvedPropsTask
 * @param mutationComponents
 * @return {*}
 * @private
 */
const _apolloMutationResponsesTask = ({schemaTask, resolvedPropsTask}, mutationComponents) => {
  // Task Object -> Task
  return R.composeK(
    // Wait for all the mutations to finish
    ({mutationComponents, props, schema, apolloClient}) => {
      return waitAll(
        mapObjToValues(
          mutation => {
            // Create variables for the current queryComponent by sending props to its configuration
            const propsWithRender = R.merge(
              props, {
                // Normally render is a container's render function that receives the apollo request results
                // and pass is as props to a child container
                render: props => null
              }
            );
            const mutationVariables = createRequestVariables(mutation, propsWithRender);
            log.debug(JSON.stringify(mutationVariables));
            const task = fromPromised(
              () => {
                return apolloClient.mutate({
                  mutation: reqStrPathThrowing('props.mutation', mutation(propsWithRender)),
                  // queryVariables are called with props to give us the variables for our mutation. This is just like Apollo
                  // does, accepting props to allow the container to form the variables for the mutation
                  variables: mutationVariables
                });
              }
            )();
            return task;
          },
          mutationComponents
        )
      );
    },
    // Resolve the schemaTask
    mapToMergedResponseAndInputs(
      ({}) => {
        return schemaTask;
      }
    ),
    // Resolve the props from the task
    mapToNamedResponseAndInputs('props',
      () => {
        return resolvedPropsTask;
      }
    )
  )({schemaTask, resolvedPropsTask, mutationComponents});
};


/**
 * Runs an apollo mutation components to test and asserts results. Note that we also test the mutations
 * in _testRender by grabbing the render methods apollo component result props mutate functions,
 * so this is a bit redundant
 * @param config
 * @param config.schemaTask
 * @param config.resolvedPropsTask
 * @param config.omitKeysFromSnapshots List of keys to remove before doing a snapshot test
 * @param mutationComponents
 * @param done
 * @return {Promise<void>}
 * @private
 */
const _testMutations = (
  {
    schemaTask,
    resolvedPropsTask,
    omitKeysFromSnapshots
  },
  mutationComponents,
  done
) => {
  expect.assertions(1);
  const errors = [];
  if (!mutationComponents) {
    console.warn("Attempt to run testQuery when query or queryVariables was not specified. Does your component actually need this test?");
    return;
  }
  // TODO Fix to work with mutationComponents and use Enzyme
  const apolloQueryResponsesTask = _apolloMutationResponsesTask(
    {
      schemaTask,
      resolvedPropsTask
    },
    mutationComponents
  );
  apolloQueryResponsesTask.run().listen(
    defaultRunConfig({
      onResolved: dataSets => {
        // If we resolve the task, make sure there is no data.error
        R.forEach(
          data => {
            if (data.error)
              errors.push(data.error);
          },
          dataSets
        );
        expect(omitDeep(omitKeysFromSnapshots, dataSets)).toMatchSnapshot();
      }
    }, errors, done)
  );
};

/**
 * Runs a render test. This asserts that the component enters the loading state, then the ready state
 * after queries have run, finally all mutationComponents' mutate function is called and we check
 * that values were updated
 * @param {Object} config
 * @param {Task} config.schemaTask Resolves to a schema and apolloClient. The schema isn't needed but the apolloClient
 * is used to create an Apollo Provider component
 * @param {Task} config.resolvedPropsTask Task that resolves to test props to pass to the container. These
 * are in turned passed to the composed Apollo components and reach the component itself
 * @param {String} config.componentName The name of the component that receives the Apollo request results and mutate
 * functions from the componsed Apollo Containers
 * @param {String} config.childClassDataName Then mame of the top-level class created by the component when it is ready
 * @param {String} config.childClassLoadingName The name of the top-level class created by the component when loading
 * @param [{Function}] config.mutationComponents Apollo Mutation component functions expecting props
 * that then return a Mutation component. The mutation function of these is called by storing the
 * props that get passed to the component render function on the container. The container instance stores the properties
 * on _apolloRenderProps so we can access the mutation function. Otherwise we'd have to have special code
 * in the component render function to expose it, which we don't want
 * See the apolloHOC function
 * @param {[String]} config.updatedPaths Paths to values that we expect our mutations changed.
 * These should only be things like update timestamps since we mutate with the same values we had.
 * Make sure that each path begins with the query name whose results we are comparing with before and after.
 * Example: ['queryRegions.data.regions.0.updatedAt']
 * @param {Object} container An uninstantiated react container that gets instantiated with
 * props to create a component instance. The container is already composed with Apollo Query/Mutation components.
 * and it's render function passes the Apollo component results by name to its component
 * (which must be named componentName)
 * @param {Function} done jest done function
 * @return {*}
 * @private
 */
const _testRender = (
  {
    schemaTask,
    resolvedPropsTask,
    componentName,
    childClassDataName,
    childClassLoadingName,
    mutationComponents,
    updatedPaths
  }, container, done) => {

  expect.assertions(3 + R.length(updatedPaths) + (childClassLoadingName ? 1 : 0));

  const errors = [];
  return composeWithChainMDeep(1, [
    mapToMergedResponseAndInputs(
      // Once we are loaded, we've already run queries, so only call mutation functions here.
      // This will update the component with the mutated data.
      // We don't actually change the values explicitly when we mutate here, so we assert it worked
      // by checking the object's update timestamp at the end of the test
      ({props, component}) => {
        // Access the special field we set for testing. This field is set by our HOC render function
        // that receive the apollo requests results and renders the childComponent. We can't
        // access the values in the childComponent because they are passed to it's render function
        const apolloRenderProps = component.instance()._apolloRenderProps;
        return R.map(
          mutationResponses => {
            return {
              mutationResponses,
              // Return the render props before and after the mutations so we can confirm that values changed
              preMutationApolloRenderProps: apolloRenderProps,
              postMutationApolloRenderProps: component.instance()._apolloRenderProps
            };
          },
          waitAll(mapObjToValues(
            (mutationComponent, name) => {
              // Create mutation variables by passing the props to the component and then accessing
              // it's variables prop, which is the result of the component's options.variables function
              // if defined
              const mutationVariables = createRequestVariables(mutationComponent, props);
              // Get the mutate function that we stored in the HOC for testing purposes.
              // This mutate function is what HOC passes via render to the component for each composed
              // mutation component
              const mutate = reqStrPathThrowing(name, apolloRenderProps);
              // Call the mutate function, this will call the Apollo mutate function and give new results
              // to our component
              return fromPromised(() => {
                let m = null;
                // TODO act doesn't suppress the warning as it should
                act(() => {
                  m = mutate({variables: mutationVariables});
                });
                return m;
              })();
            },
            mutationComponents
          ))
        );
      }
    ),
    mapToMergedResponseAndInputs(
      ({props, apolloClient}) => {
        // If we have an Apollo component, we use enzyme-wait to await the query to run and the the child
        // component that is dependent on the query result to render. If we don't have an Apollo component,
        // this child will be rendered immediately without delay
        let tsk = null;
        const containerInstance = e(container, props);
        // Wrap the component in mock Apollo and Redux providers.
        // If the component doesn't use Apollo it just means that it will render its children synchronously,
        // rather than asynchronously
        const wrapper = mountWithApolloClient(
          {apolloClient},
          containerInstance
        );
        // Find the top-level component. This is always rendered in any Apollo status (loading, error, store data)
        const component = wrapper.find(container);
        // Make sure the component props are consistent since the last test run
        expect(component.length).toEqual(1);

        // TODO act doesn't suppress the warning as it should
        act(() => {
          // If we have an Apollo component, our immediate status after mounting the component is loading. Confirm
          if (childClassLoadingName) {
            expect(component.find(`.${getClass(childClassLoadingName)}`).length).toEqual(1);
          }
          tsk = waitForChildComponentRenderTask(wrapper, componentName, childClassDataName);
        });
        return tsk.map(childComponent => {
          return {containerInstance, component, childComponent};
        });
      }),
    // Resolve the schemaTask. This resolves to {schema, apolloClient}
    mapToMergedResponseAndInputs(
      ({schemaTask}) => schemaTask
    ),
    mapToNamedResponseAndInputs('props',
      ({resolvedPropsTask}) => resolvedPropsTask
    )
  ])({schemaTask, resolvedPropsTask, componentName, childClassDataName}).run().listen(
    defaultRunConfig({
      onResolved: ({
                     props, schema, apolloClient, containerInstance, component, childComponent,
                     mutationResponses, preMutationApolloRenderProps, postMutationApolloRenderProps
                   }) => {
        expect(childComponent.length).toEqual(1); // We found the child, meaning we loaded data and rendered
        // We should get a non-null mutation result for every mutationComponent
        expect(R.length(R.filter(R.propOr(null, 'data'), mutationResponses))).toEqual(R.length(R.values(mutationComponents)));
        if (updatedPaths) {
          R.forEach(
            updatedPath => {
              expect(reqStrPathThrowing(updatedPath, preMutationApolloRenderProps)).not.toEqual(
                reqStrPathThrowing(updatedPath, postMutationApolloRenderProps)
              );
            },
            updatedPaths
          );
        }
      }
    }, errors, done)
  );
};

/**
 * Tests render errors results and asserts
 * @param schemaTask
 * @param resolvedPropsTask
 * @param componentName
 * @param childClassDataName
 * @param childClassErrorName
 * @param childClassLoadingName
 * @param errorMaker
 * @param container
 * @param done
 * @private
 */
const _testRenderError = (
  {
    schemaTask, resolvedPropsTask, componentName, childClassDataName, childClassLoadingName, childClassErrorName, errorMaker
  },
  container,
  done
) => {
  expect.assertions(2);
  const errors = [];
  if (!errorMaker || !childClassErrorName) {
    console.warn("One or both of errorMaker and childClassErrorName not specified, does your component actually need to test render errors?");
    return;
  }
  R.composeK(
    ({props, schema, apolloClient}) => {
      const composedContainer = e(container, props);
      let tsk = null;
      act(() => {
        const wrapper = mountWithApolloClient(
          {apolloClient},
          composedContainer
        );
        const component = wrapper.find(componentName);
        expect(component.find(`.${getClass(childClassLoadingName)}`).length).toEqual(1);
        tsk = waitForChildComponentRenderTask(wrapper, componentName, childClassErrorName);
      });
      return tsk;
    },
    // Resolve the schemaTask. This resolves to {schema, apolloClient}
    mapToMergedResponseAndInputs(
      ({schemaTask}) => schemaTask
    ),
    mapToNamedResponseAndInputs('props',
      ({resolvedPropsTask}) => R.map(
        props => errorMaker(props),
        resolvedPropsTask
      )
    )
  )({schemaTask, resolvedPropsTask, componentName, childClassDataName}).run().listen(
    defaultRunConfig({
      // The error component should have an error message as props.children
      onResolved: childComponent => {
        expect(R.length(childComponent)).toEqual(1);
      }
    }, errors, done)
  );
};

/**
 * Given a Task to fetch parent container props and a task to fetch the current container props,
 * Fetches the parent props and then samplePropsTaskMaker with the  parent props
 * @param {Task<Result>} chainedParentPropsResultTask Task that resolves to the parent container props in a Result.Ok
 * @param {Function} samplePropsTaskMaker 2 arity function expecting parent props.
 * Returns a Task from a container that expects sampleOwnProps resolves to Result.Ok
 * @returns {Task} A Task to asynchronously return the parentContainer props merged with sampleOwnProps
 * in an Result.Ok. If anything goes wrong an Result.Error is returned
 */
export const propsFromParentPropsTask = v((chainedParentPropsResultTask, samplePropsTaskMaker) =>
    chainMDeep(2,
      // Chain the Result.Ok value to a Task combine the parent props with the props maker
      // Task Result.Ok -> Task Object
      parentContainerSampleProps => samplePropsTaskMaker(parentContainerSampleProps),
      chainedParentPropsResultTask
    ),
  [
    ['initialState', PropTypes.shape().isRequired],
    ['chainedParentPropsResultTask', PropTypes.shape().isRequired],
    ['samplePropsTaskMaker', PropTypes.func.isRequired]
  ],
  'propsFromParentPropsTask'
);


