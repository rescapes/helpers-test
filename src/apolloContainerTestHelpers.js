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
  mountWithApolloClient,
  parentPropsForContainer,
  waitForChildComponentRenderTask
} from './componentTestHelpers.js';
import {e} from '@rescapes/helpers-component';
import PropTypes from 'prop-types';
import {v} from '@rescapes/validate';
import T from 'folktale/concurrency/task';

import {
  composeWithChain,
  defaultNode,
  defaultRunConfig,
  filterWithKeys,
  mapObjToValues,
  mapToMergedResponseAndInputs,
  mapToNamedResponseAndInputs,
  omitDeep,
  reqStrPathThrowing,
  strPathOr
} from '@rescapes/ramda';
import * as R from 'ramda';
import Result from 'folktale/result';
import {
  apolloQueryResponsesContainer,
  composeWithComponentMaybeOrTaskChain,
  containerForApolloType, deleteTokenCookieMutationRequestContainer,
  getRenderPropFunction,
  mapTaskOrComponentToNamedResponseAndInputs,
  nameComponent
} from '@rescapes/apollo';
import * as chakra from "@chakra-ui/core";
import {tokenAuthMutationContainer, tokenAuthOutputParams} from '@rescapes/apollo/src/stores/tokenAuthStore';
import {
  mapTaskOrComponentToConcattedNamedResponseAndInputs,
  mutateOnceAndWaitContainer
} from '@rescapes/apollo/src/helpers/containerHelpers';

const {fromPromised, of, waitAll} = T;
const {ChakraProvider} = defaultNode(chakra);


/**
 * Filter for just the query containers of the given apolloContainersLogout
 * @param {Object} apolloContainers Keyed by request name and valued by apollo request container.
 * Only those beginning with 'query' are considered
 * @return {*}
 */
export const filterForQueryContainers = apolloContainers => {
  return filterWithKeys(
    (_, key) => {
      return R.includes('query', key);
    },
    apolloContainers
  );
};

/***
 * Filter for just the mutation containers of the given apolloContainersLogout
 * @param {Object} apolloContainers Keyed by request name and valued by apollo request container.
 * Only those beginning with 'mutat' are considered
 * @return {*}
 */
export const filterForMutationContainers = apolloContainers => {
  return filterWithKeys(
    (_, key) => {
      return R.includes('mutat', key);
    },
    apolloContainers
  );
};

/**
 * Returns default empty updatePaths object for all mutation requests in the form
 * {
 *   aMutationName: {component:[], client:[]},
 *   bMutationName: {component:[], client:[]}
 *   ...
 * }
 * @param {Object} apolloContainers Keyed by mutation container name, valued by apollo request
 * @param {Object} overrides, same shape as above, but with component and client filled in with
 * paths of data that will update as a result of the mutation. Provide both a component and client
 * path. If you omit a mutation request key, that mutation will not be tested for changes. This
 * makes sense for things like authentication that don't have any new values when you call mutation twice.
 * It makes most sense to test update timestamps, since we mutate with the same data twice
 * @returns {Object} The above object
 */
export const defaultUpdatePathsForMutationContainers = (apolloContainers, overrides) => {
  return R.compose(
    defaults => R.merge(defaults, overrides),
    apolloContainers => {
      return R.map(
        R.always({component: [], client: []}),
        filterForMutationContainers(apolloContainers({}))
      );
    }
  )(apolloContainers);
};


/**
 * Runs tests on an apollo React container with the * given config.
 * Even if the container being tested does not have an apollo query, this can be used
 * @param {Object} context
 * {
      componentContext: {
        name: componentId,
        statusClasses: {
          // A classname rendered in the component renderData
          data: ...
          // A classname rendered in the component renderLoading
          loading: ...
          // A classname rendered in the component renderError
          error: ...
          // A classname rendered in the component renderNoAuthentication (or renderData with no auth)
          noAuthentication: ...
        }
      },
      apolloContext: {
        apolloConfigContainer,
        apolloContainersLogout,
        waitLength
      },
      testContext: {
        errorMaker,
        omitKeysFromSnapshots,
        updatedPaths,
        authorizeMutationKey
        deauathorizeMutationKey
      }
    }
 * @param {String} context.componentContext.componentId The data-testid of the React component that the container wraps.
 * This can be any combination of class and component name that Enzyme can find.
 * @param {String} context.componentContext.statusClasses.data.childDataId A class used in a React component in the named
 * This can be any combination of class and component name that Enzyme can find.
 * @param {String} [context.componentContext.statusClasses.data.childLoadingId] Optional. A class used in a React component in the named
 * This can be any combination of class and component name that Enzyme can find.
 * component's renderLoading method--or any render code called when apollo loading is true. Normally
 * only needed for components with queries.
 * @param {String} [context.componentContext.statusClasses.data..childErrorId] Optional. A class used in a React component in the named
 * component's renderError method--or any render code called when apollo error is true. Normally only
 * needed for components with queries.
 * This can be any combination of class and component name that Enzyme can find.
 * component's renderData method--or any render code when apollo data is loaded
 * @param {Object} context.theme The Chakra theme
 * @param {Object} apolloContext
 * @param {Task|Function<String, Task>} apolloContext.apolloConfigContainer Task resolving to the ApolloConfig.
 * This can alternatively be a function that accepts the name of the test and returns a task.
 * This is used to optionally pass authenticated or non authenticated apolloConfigs based on the test
 * @param {[Object|Function|Task]} apolloContext.apolloContainersLogout List of apolloContainersLogout returning an Apollo Query or Mutate component
 * Apollo Containers or Apollo Tasks. The tests below call this function with and empty value and then
 * wrap the result in adopt of react-adopt to make adopted Apollo components that render all of their
 * request results to a single render function. The tests also call this function with an apolloConfig that
 * contains an apolloClient to generate tasks out of the apollo containers. This is used for testQueries
 * and testMutations so we can see if the requests work as expected independent of a readct component
 * @param {Number} apolloContext.waitLength how long to wait in ms for async apollo requests. Defaults to 10000 ms
 * @param {Object} testContext
 * @param {Function} testContext.apolloContainersLogout Function expecting an optional apolloConfig and returning
 * @param {Function} [testContext.errorMaker] Optional unary function that expects the results of the
 * @param {[String]} testContext.omitKeysFromSnapshots Keys to not snapshot test because
 * values aren't deterministic. This must at least include id and should include dates that change.
 * The keys are omitted from all result objects deep prior to snapshot testing
 * @param {[{Object}]} testContext.updatedPaths Paths to values that should change between mutations.
 * This only works for things like update date or instance version number that change every mutation.
 * It's in the form {component: path, client: path}. For component we use the result of querying after mutation,
 * since we do all requests. For client tests we test the difference between mutating twice
 * @param {String} [authorizeMutationKey] The name of the mutation key in the result of testContext.apolloContainersLogout
 * functions for authorizing when we run testRenderAuthentication. Props from configToChainedPropsForSampleContainer
 * are passed, so they must have the needed params, such as username and password
 * @param {String} [deauthorizeMutationKey] The name of the mutation key in the result of testContext.apolloContainersLogout
 * functions for deauthorizing when we run testRenderAuthentication. Props from configToChainedPropsForSampleContainer
 * are passed although typically no props are needed
 * @param {String} testContext.loginComponentId For the authentication test, a component that is expected on the login component
 * This is sought and the mutation with key authorizeMutationKey is expected in its props
 * This can be any combination of class and component name that Enzyme can find.
 * @param {String} testContext.logoutComponentId For the authentication test, a component that is expected on the logout component
 * This is sought and the mutation with key deauthorizeMutationKey is expected in its props
 * This can be any combination of class and component name that Enzyme can find.
 * @param {Object} HOC Apollo container created by calling react-adopt or similar
 * @param {Object} component. The child component to container having a render function that receives
 * the results of the apollo requests from container
 * @param {Function} configToChainedPropsForSampleContainer A function expecting the apolloConfig and possible a boolean flag (default true)
 * and resolving to the props in a Task. The flag set false is used to configToChainedPropsForSampleContainer
 * not to call the containers apollo queries with the parent props and return the results. When we test rendering
 * we don't want to query ahead of time because the rendering process will invoke the queries.
 * If a container has no Apollo requests this function should return {}
 * @returns {Object} Each of the available tests and a log out task that can run after each test if needed
 *  {testComposeRequests,
 testQueries,
 testMutations,
 testRenderError,
 testRender,
 testRenderAuthentication,
 afterEachTask}
 */
export const apolloContainerTests = v((context, container, component, configToChainedPropsForSampleContainer) => {
    const {
      componentContext: {
        componentId,
        statusClasses: {
          data: childDataId,
          loading: childLoadingId,
          error: childErrorId,

          // If we are testing login with, set the classname that shows when the user needs to login:
          // testRenderAuthentication
          noAuthentication: childClassNoAuthName
        },
        theme
      },
      apolloContext: {
        apolloConfigContainer,
        apolloContainers,
        waitLength
      },
      testContext: {
        errorMaker,
        omitKeysFromSnapshots,
        updatedPaths,
        authorizeMutationKey,
        deauthorizeMutationKey,
        loginComponentId,
        logoutComponentId
      }
    } = context;

    const apolloConfigOptionalFunctionContainer = testName => {
      return R.ifElse(
        R.hasIn('run'),
        apolloConfigContainer => {
          return () => apolloConfigContainer;
        },
        // Call with test name if not task
        apolloConfigContainer => {
          return apolloConfigContainer(testName);
        }
      )(apolloConfigContainer);
    };

    // A task function or component function that resolves props all the way up the hierarchy chain, ending with props for this
    // container based on the ancestor Containers/Components
    const resolvedPropsContainer = (apolloConfig, {render}) => {
      return configToChainedPropsForSampleContainer(
        apolloConfig,
        {
          containerName: componentId,
          runParentContainerQueries: true
        },
        {render}
      );
    };

    /**
     * Tests that we can mount the composed request container
     * @param done
     */
    const testComposeRequests = done => {
      expect.assertions(1);
      const errors = [];
      composeWithChain([
        ({apolloClient, props}) => of(mountWithApolloClient(
          {apolloClient},
          e(ChakraProvider, {theme},
            e(
              container,
              props,
              responseProps => {
                // Render anything. We're just testing request composition
                return e('div');
              }
            )
          )
        )),
        mapToNamedResponseAndInputs('props',
          ({apolloClient}) => resolvedPropsContainer({apolloClient}, {})
        ),
        mapToMergedResponseAndInputs(
          // Resolves to {schema, apolloClient}
          () => apolloConfigOptionalFunctionContainer('testComposeRequests')
        )
      ])({}).run().listen(
        defaultRunConfig({
          onResolved: component => {
            expect(R.length(component)).toBe(1);
          }
        }, errors, done)
      );
    };


    /**
     * For Apollo Containers with queries, tests that the query results match the snapshot
     */
    const testQueries = done => {
      return _testQueries(
        {
          containerName: componentId,
          apolloConfigContainer: apolloConfigOptionalFunctionContainer('testQueries'),
          resolvedPropsContainer,
          omitKeysFromSnapshots
        },
        apolloConfig => filterForQueryContainers(apolloContainers(apolloConfig)),
        done
      );
    };

    /**
     * For Apollo Containers with mutations, tests that the mutation results match the snapshot
     */
    const testMutations = done => _testMutations(
      {
        apolloConfigContainer: apolloConfigOptionalFunctionContainer('testMutations'),
        resolvedPropsContainer,
        updatedPaths
      },
      apolloConfig => filterForMutationContainers(apolloContainers(apolloConfig)),
      done
    );

    /**
     * Tests that the correct child class renders and that the child component props match the snapshot
     * @param done
     * @return {Promise<void>}
     */
    const testRender = done => {
      const errors = [];
      const mutationComponents = filterForMutationContainers(apolloContainers({}));
      _testRenderExpectations({}, mutationComponents, updatedPaths);
      R.map(
        ({prePostMutationComparisons, ...rest}) => {
          testMutationChanges('component', updatedPaths, prePostMutationComparisons);
          return rest;
        },
        _testRenderTask(
          {
            apolloConfigContainer: apolloConfigOptionalFunctionContainer('testRender'),
            resolvedPropsContainer,
            componentId,
            childDataId,
            childLoadingId,
            omitKeysFromSnapshots,
            mutationComponents,
            updatedPaths,
            waitLength,
            theme
          },
          container,
          component,
          done
        )).run().listen(_testRenderRunConfig(updatedPaths, errors, done));
    };

    /**
     * Tests an unauthorized request followed by authentication
     * @param done
     */
    const testRenderAuthentication = done => {
      const mutationComponents = filterForMutationContainers(apolloContainers({}));
      const errors = [];
      _testRenderExpectations({testingAuthentication: true}, mutationComponents, updatedPaths);
      composeWithChain([
        // Logout and render
        () => {
          return _testRenderTask(
            {
              apolloConfigContainer: apolloConfigOptionalFunctionContainer('testRenderAuthenticationNoAuth'),
              resolvedPropsContainer,
              componentId,
              childDataId: childClassNoAuthName,
              // No loading state for no auth
              childLoadingId: childClassNoAuthName,
              omitKeysFromSnapshots,
              mutationComponents,
              updatedPaths,
              waitLength,
              // We can't mutate with an unauthenticated user
              skipMutationTests: true,
              theme,
              authenticate: false
            },
            container,
            component,
            done
          );
        },
        // Deauthorize
        ({wrapper}) => {
          const logoutIdSearch = R.test(/^[A-Z]\S+/, logoutComponentId) ? logoutComponentId : `[data-testid='${logoutComponentId}']`;
          const {mutation} = reqStrPathThrowing(
            deauthorizeMutationKey,
            wrapper.find(logoutIdSearch).first().props()
          );
          return fromPromised(() => {
            return mutation();
          })();
        },
        // Authorized render
        (tokenAuthResponse) => {
          return R.map(
            ({prePostMutationComparisons, ...rest}) => {
              // Test our mutation tests while authorized
              testMutationChanges('component', updatedPaths, prePostMutationComparisons);
              return rest;
            },
            _testRenderTask(
              {
                apolloConfigContainer: apolloConfigOptionalFunctionContainer('testRenderAuthentication'),
                resolvedPropsContainer,
                componentId,
                childDataId,
                // No loading state for no auth
                childLoadingId,
                omitKeysFromSnapshots,
                // Filter out mutations that are used for auth and de-auth
                mutationComponents: R.compose(
                  apolloContainers => filterWithKeys(
                    (_, key) => {
                      return !R.includes(key, [authorizeMutationKey, deauthorizeMutationKey]);
                    },
                    apolloContainers
                  ),
                  apolloContainers => filterForMutationContainers(apolloContainers),
                  obj => apolloContainers(obj)
                )({}),
                updatedPaths,
                waitLength,
                theme
              },
              container,
              component,
              done
            ));
        },
        // Authorize
        ({wrapper, container}) => {
          const props = container.props();
          const loginIdSearch = R.test(/^[A-Z]\S+/, loginComponentId) ? loginComponentId : `[data-testid='${loginComponentId}']`;
          const {mutation} = reqStrPathThrowing(
            authorizeMutationKey,
            wrapper.find(loginIdSearch).first().props()
          );
          // Pass the username and password from the props
          return fromPromised(() => {
            return mutation({variables: R.pick(['username', 'password'], props)});
          })();
        },
        // No auth login
        () => {
          return _testRenderTask(
            {
              apolloConfigContainer: apolloConfigOptionalFunctionContainer('testRenderAuthenticationNoAuth'),
              resolvedPropsContainer,
              componentId,
              childDataId: childClassNoAuthName,
              // No loading state for no auth
              childLoadingId: childClassNoAuthName,
              omitKeysFromSnapshots,
              mutationComponents: filterForMutationContainers(apolloContainers({})),
              updatedPaths,
              waitLength,
              // We can't mutate with an unauthenticated user
              skipMutationTests: true,
              theme,
              authenticate: false
            },
            container,
            component,
            done
          );
        }
      ])().run().listen(_testRenderRunConfig(updatedPaths, errors, done));
    };

    /**
     * For components with an error state, tests that the error component renders
     * @param done
     * @return {Promise<void>}
     */
    const testRenderError = done => {
      _testRenderError(
        {
          errorMaker,
          apolloConfigContainer: apolloConfigOptionalFunctionContainer('testRenderError'),
          resolvedPropsContainer,
          componentId,
          childLoadingId,
          childDataId,
          childErrorId,
          mutationComponents: filterForMutationContainers(apolloContainers({})),
          waitLength,
          theme
        },
        container,
        component,
        done
      );
    };

    return {
      testComposeRequests,
      testQueries,
      testMutations,
      testRenderError,
      testRender,
      testRenderAuthentication,
      // Return this so we can logout and clear the cache after each test
      afterEachTask: composeWithChain([
        ({apolloClient}) => deleteTokenCookieMutationRequestContainer({apolloClient}, {}, {}),
        () => apolloConfigOptionalFunctionContainer()
      ])()
    };
  },
  [
    ['config', PropTypes.shape({
        componentContext: PropTypes.shape({
          componentId: PropTypes.string.isRequired,
          statusClasses: PropTypes.shape({
            data: PropTypes.string.isRequired,
            loading: PropTypes.string,
            error: PropTypes.string
          })
        }),
        apolloContext: PropTypes.shape({
          apolloConfigContainer: PropTypes.oneOfType(
            [
              PropTypes.shape(),
              PropTypes.func
            ]).isRequired,
          requests: PropTypes.shape()
        }),
        testContext: PropTypes.shape({
          errorMaker: PropTypes.func
        })
      }
    )],
    ['container', PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired],
    ['component', PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired],
    ['propsResultTask', PropTypes.func.isRequired]
  ], 'apolloContainerTests');


/**
 * Runs an apollo queries test and asserts results
 * @param {String} containerName  For debugging, to label the container with a name
 * @param apolloConfigContainer
 * @param resolvedPropsContainer
 * @param {Function} apolloConfigToQueryTasks Function expecting an apolloConfig and returning the query tasks
 * @param done
 * @return void
 * @private
 */
const _testQueries = (
  {
    containerName,
    apolloConfigContainer,
    resolvedPropsContainer,
    omitKeysFromSnapshots
  },
  apolloConfigToQueryTasks,
  done
) => {
  expect.assertions(1);
  const errors = [];
  if (!apolloConfigToQueryTasks) {
    console.warn("Attempt to run testQuery when query or queryVariables was not specified. Does your component actually need this test?");
    return;
  }
  composeWithChain([
    ({queryContainers, responses}) => {
      // Limit to <key, response> without all the props
      return of(R.pick(R.keys(queryContainers), responses));
    },
    mapToNamedResponseAndInputs('responses',
      ({apolloConfig, queryContainers}) => {
        // Resolves to <key, response> plus all the props
        return apolloQueryResponsesContainer(
          apolloConfig,
          {
            containerName,
            resolvedPropsContainer,
            queryContainers
          },
          {}
        );
      }
    ),
    mapToNamedResponseAndInputs('queryContainers',
      ({apolloConfig, apolloConfigToQueryTasks}) => {
        // Resolves to <key, Task>
        return of(apolloConfigToQueryTasks(apolloConfig));
      }
    ),
    mapToNamedResponseAndInputs('apolloConfig',
      ({apolloConfigContainer}) => apolloConfigContainer
    )
  ])({apolloConfigContainer, apolloConfigToQueryTasks}).run().listen(
    defaultRunConfig({
      onResolved: responsesByKey => {
        // If we resolve the task, make sure there is no data.error
        R.forEach(
          data => {
            if (data.error)
              errors.push(data.error);
          },
          responsesByKey
        );
        expect(R.map(
          dataSet => {
            return R.compose(
              data => {
                // Remove keys that are not determinant, like update dates
                return omitDeep(omitKeysFromSnapshots, data);
              },
              dataSet => {
                // Just extract the query result. We don't care about what props got through,
                // because they might change over time if we are passing them down to new child components
                return reqStrPathThrowing('data', dataSet);
              }
            )(dataSet);
          },
          R.values(responsesByKey)
        )).toMatchSnapshot();
      }
    }, errors, done)
  );
};


/**
 * Runs an apollo mutation components to test and asserts results. Note that we also test the mutations
 * in _testRender by grabbing the render methods apollo component result props mutate functions,
 * so this is a bit redundant
 * @param config
 * @param config.apolloConfigContainer
 * @param config.resolvedPropsContainer
 * @param {Function} apolloConfigToMutationTasks Expects an apolloConfig and returns an object keyed by
 * mutation name and valued by mutation task
 * @param done
 * @return void
 * @private
 */
const _testMutations = (
  {
    apolloConfigContainer,
    resolvedPropsContainer,
    updatedPaths
  },
  apolloConfigToMutationTasks,
  done
) => {
  const assertions = R.add(
    // The number of mutations with updatePaths to test
    R.length(R.values(updatedPaths)),
    // The total number of updatePaths, counted by looking at the client array
    R.compose(
      R.length,
      updatedValues => R.chain(R.propOr([], 'client'), updatedValues),
      updatedPaths => R.values(updatedPaths)
    )(updatedPaths)
  );

  expect.assertions(assertions);

  const errors = [];
  if (!apolloConfigToMutationTasks) {
    console.warn("Attempt to run testMutation when apolloConfigToMutationTasks was not specified. Does your component actually need this test?");
    return;
  }
  const mutationResponseTask = apolloMutationResponsesTask(
    {
      apolloConfigContainer,
      resolvedPropsContainer
    },
    apolloConfigToMutationTasks
  );
  mutationResponseTask.run().listen(
    defaultRunConfig({
      onResolved: prePostMutationComparisons => {
        testMutationChanges('client', updatedPaths, prePostMutationComparisons);
      }
    }, errors, done)
  );
};


/**
 * Runs the apollo mutations in mutationComponents
 * @param apolloConfigContainer
 * @param resolvedPropsContainer
 * @param {Function } apolloConfigToMutationTasks Expects an apolloConfig and returns and object keyed by mutation
 * name and valued by mutation tasks
 * @return {Task<[Object]>} A task resolving to a list of the mutation responses
 * @private
 */
export const apolloMutationResponsesTask = ({
                                              apolloConfigContainer,
                                              resolvedPropsContainer
                                            }, apolloConfigToMutationTasks) => {
  // Task Object -> Task
  return composeWithChain([
    // Wait for all the mutations to finish
    ({apolloConfigToMutationTasks, props, apolloClient}) => {
      // Create variables for the current queryComponent by sending props to its configuration
      const propsWithRender = R.merge(
        props, {
          // Normally render is a container's render function that receives the apollo request results
          // and pass is as props to a child container
          //render: props => null
        }
      );
      return waitAll(
        mapObjToValues(
          (mutationExpectingProps, mutationName) => {
            return composeWithChain([
              ({mutationExpectingProps, preMutationApolloRenderProps, postMutationApolloRenderProps}) => {
                if (!preMutationApolloRenderProps || !postMutationApolloRenderProps) {
                  throw new Error(`For mutation ${mutationName}, either the preMutationApolloRenderProps or postMutationApolloRenderProps or both are null`);
                }
                return of({
                  mutationName,
                  // Return the render props before and after the mutations so we can confirm that values changed
                  preMutationApolloRenderProps,
                  postMutationApolloRenderProps,
                  mutationResponse: postMutationApolloRenderProps
                });
              },
              mapToNamedResponseAndInputs('postMutationApolloRenderProps',
                ({mutationExpectingProps, propsWithRender, preMutationApolloRenderProps}) => {
                  // Mutate again to get updated dates
                  return mutationExpectingProps(propsWithRender);
                }
              ),
              mapToNamedResponseAndInputs('preMutationApolloRenderProps',
                ({mutationExpectingProps, propsWithRender}) => {
                  // Mutate once
                  return mutationExpectingProps(propsWithRender);
                }
              )
            ])({mutationExpectingProps, propsWithRender});
          },
          apolloConfigToMutationTasks({apolloClient})
        )
      );
    },

    // Resolve the props from the task
    mapToNamedResponseAndInputs('props',
      ({apolloClient}) => {
        return resolvedPropsContainer({apolloClient}, {});
      }
    ),
    // Resolve the apolloConfigContainer
    mapToMergedResponseAndInputs(
      ({}) => {
        return apolloConfigContainer;
      }
    )
  ])({apolloConfigContainer, resolvedPropsContainer, apolloConfigToMutationTasks});
};

/**
 * Runs a render test. This asserts that the component enters the loading state, then the ready state
 * after queries have run, finally all mutationComponents' mutate function is called and we check
 * that values were updated
 * @param {Object} config
 * @param {Task} config.apolloConfigContainer Resolves to a schema and apolloClient. The schema isn't needed but the apolloClient
 * is used to create an Apollo Provider component
 * @param {Task} config.resolvedPropsContainer Task that resolves to test props to pass to the container. These
 * are in turned passed to the composed Apollo components and reach the component itself
 * @param {String} container.componentId The data-testid of the container
 * @param {String} config.componentId The componentIdId of the component that receives the Apollo request results and mutate
 * functions from the componsed Apollo Containers
 * @param {String} config.childDataId Then id of the top-level class created by the component when it is ready
 * @param {String} config.childLoadingId The id of the top-level class created by the component when loading
 * @param [{Function}] config.mutationComponents Apollo Mutation component functions expecting props
 * @param {Boolean} [config.skipMutationTests] Default false. Set false for unauthenticated users,
 * since they can't mutate
 * that then return a Mutation component. The mutation function of these is called by storing the
 * props that get passed to the component render function on the container. The container instance stores the properties
 * on _apolloRenderProps so we can access the mutation function. Otherwise we'd have to have special code
 * in the component render function to expose it, which we don't want
 * See the apolloHOC function
 * @param {Object<String:[String]>} config.updatedPaths Keyed by the mutation named and values by a list of path that we
 * expect our mutations changed. These should only be things like update timestamps since we mutate with the same values we had.
 * Make sure that each path begins with the query name whose results we are comparing with before and after.
 * Example: {mutationRegion: ['queryRegions.data.regions.0.updatedAt']} means "when I call mutatRegion, queryRegion's
 * result should update"
 * @param {Object} theme The Chakra theme
 * @param {Object} container The composed Apollo container. We create a react element from this
 * with component as the children prop. component
 * props to create a component instance. The container is already composed with Apollo Query/Mutation components.
 * and it's render function passes the Apollo component results by name to its component
 * (which must be named componentId)
 * @param {Object} component The component that receives the results of queries and mutations and displays
 * loading, error, or data states
 * @param {Function} done jest done function
 * @return {*}
 * @private
 */
const _testRenderTask = (
  {
    apolloConfigContainer,
    resolvedPropsContainer,
    componentId,
    childDataId,
    childErrorId,
    childLoadingId,
    mutationComponents,
    updatedPaths,
    waitLength,
    skipMutationTests = false,
    theme,
    authenticate = true
  }, container, component, done) => {

  return composeWithChain([
    mapToNamedResponseAndInputs('prePostMutationComparisons',
      // Once we are loaded, we've already run queries, so only call mutation functions here.
      // This will update the component with the mutated data.
      // We don't actually change the values explicitly when we mutate here, so we assert it worked
      // by checking the object's update timestamp at the end of the test
      ({apolloClient, wrapper, container, component}) => {
        return skipMutationTests ?
          // No tests
          containerForApolloType(
            {apolloClient},
            {
              render: getRenderPropFunction({}),
              response: null
            }
          ) :
          _testRenderComponentMutationsTask({
            apolloConfig: {apolloClient},
            mutationComponents,
            componentId,
            childDataId,
            waitLength
          }, wrapper, component);
      }
    ),
    // Render component, calling queries
    mapToMergedResponseAndInputs(
      ({apolloClient, resolvedPropsContainer, componentId, childLoadingId, childDataId, childErrorId}) => {
        return _testRenderComponentTask(
          {
            apolloClient,
            componentId,
            childLoadingId,
            childDataId,
            childErrorId,
            waitLength,
            theme,
            authenticate
          },
          container,
          component,
          resolvedPropsContainer
        );
      }
    ),
    // Resolve the apolloConfigContainer. This resolves to {schema, apolloClient}
    mapToMergedResponseAndInputs(
      ({apolloConfigContainer}) => {
        return apolloConfigContainer;
      }
    )
  ])({
    apolloConfigContainer,
    resolvedPropsContainer,
    componentId,
    childLoadingId,
    childDataId,
    childErrorId,
    mutationComponents
  });
};
const _testRenderExpectations = ({testingAuthentication = false}, mutationComponents, updatedPaths) => {
  // If we are testing authentication, to early assertions are run thrice because _testRenderTask
  // is called twice. The mutation tests are only run once when we are authorized to run them
  const multiplier = testingAuthentication ? 3 : 1;
  // However the auth mutation and deauth mutation must be skipped in _testRenderTask because we don't
  // want mess with the authentication state. Thus subtract two assertions that won't run
  // TODO seems unneeded, but I don't know why
  const subtract = 0; //testingAuthentication ? 2 : 0;
  expect.assertions(
    // Assertions during _testRenderComponentTask
    (2 * multiplier) - subtract +
    // Asserts that the child component was found
    1 +
    // One assertion per mutation component to prove the mutation function returned a value
    R.length(R.values(mutationComponents)) +
    // One per updated paths, which are keyed by mutation and valued by {component: [paths]}
    R.length(R.chain(R.prop('component'), R.values(updatedPaths)))
  );
};

const _testRenderRunConfig = (updatedPaths, errors, done = null) => {
  return defaultRunConfig({
    onResolved: ({component, prePostMutationComparisons}) => {
      expect(component.length).toBeGreaterThan(0); // We found the child, meaning we loaded data and rendered
    }
  }, errors, done);
};


/**
 * Tests rendering a component where Apollo query responses must be awaited.
 * We first check for the childLoadingId component to be loaded and then childDataId,
 * which is either the data ready or error component, depending on which result we are expeciting
 * @param {Object} config
 * @param config.apolloClient
 * @param config.componentId
 * @param {String} config.childLoadingId
 * @param {String} config.childDataId
 * @param {Number} config.waitLength Optional number of milliseconds to wait for asynchronous operations. Defaults to 10000
 * @param {Object} config.theme Chakra theme
 * @param {Object} container The apollo container to test
 * @param {Object} component The apollo component of the container to test
 * @param {Object} props The props to pass
 * @return {Task} A Task resolving to {wrapper, childComponent, component},
 * where wrapper is the mounted ApolloProvider->ReadAdopt->Containers->Component
 * and component is the Component within that stack. This result can be used to test mutations.
 * childComponent is the child of component that has the class containerId of childDataId
 * @private
 */
const _testRenderComponentTask = v((
  {
    apolloClient,
    componentId,
    childLoadingId,
    childDataId,
    waitLength,
    theme,
    authenticate,
    errorMaker
  }, container, component, resolvedPropsContainer) => {

    const render = props => {
      const _props = R.omit(['render', 'children'], props);
      return e(
        // Name the container so we can find it by name
        nameComponent('TestContainer', container),
        _props,
        // These props contains the results of the Apollo queries and the mutation functions
        // Merge them with the original props, which can return values unrelated to the apollo requests
        responseProps => {
          return nameComponent('testComponent', e(
            component,
            R.omit(['render', 'children'], R.merge(props, responseProps))
          ));
        }
      );
    };

    const samplePropsContainer = composeWithComponentMaybeOrTaskChain([
      props => {
        return containerForApolloType(
          {},
          {
            render: getRenderPropFunction(props),
            response: props
          }
        );
      },
      mapTaskOrComponentToNamedResponseAndInputs({}, 'tokenAuth',
        ({tokenAuthResponse, ...props}) => {
          // Create the React element from container, passing the props and component via a render function.
          // The react-adopt container expects to be given a render function so it can pass the results of the
          // Apollo request components
          return authenticate ?
            // Login in to the server so the apolloClient is authenticated
            mutateOnceAndWaitContainer(
              {},
              {responsePath: 'result.data.tokenAuth'},
              tokenAuthResponse,
              reqStrPathThrowing('render', props)
            ) :
            containerForApolloType(
              {},
              {
                render: getRenderPropFunction(props),
                response: props
              }
            );
        }),
      mapTaskOrComponentToNamedResponseAndInputs({}, 'tokenAuthResponse',
        props => {
          return tokenAuthMutationContainer(
            {},
            {outputParams: tokenAuthOutputParams},
            props
          );
        }
      ),
      props => {
        // If we want to make an error condition in the props, do it now
        return containerForApolloType(
          {},
          {
            render: getRenderPropFunction(props),
            response: errorMaker ? errorMaker(props) : props
          }
        );
      },
      ({render}) => {
        // Create the React element from container, passing the props and component via a render function.
        // The react-adopt container expects to be given a render function so it can pass the results of the
        // Apollo request components
        return resolvedPropsContainer(
          // Never pass the apolloClient to the resolved props container.
          // We want to treat the latter as a component
          {},
          {render}
        );
      }
    ])({render});

    // Mount the sample props container, whose render method renders the component
    const wrapper = mountWithApolloClient(
      {apolloClient},
      nameComponent('ChakraProvider',
        e(ChakraProvider, {theme},
          samplePropsContainer
        ))
    );

    return composeWithChain([
      ({rendered: {wrapper, component: container, childComponent: component}}) => {
        return of({
          wrapper,
          container,
          component: component.first()
        });
      },
      mapToNamedResponseAndInputs('rendered',
        ({wrapper, childLoadingId, childDataId, loading}) => {
          const componentIdSearch = R.test(/^[A-Z]\S+/, componentId) ? componentId : `[data-testid='${componentId}']`;
          const childLoadingIdSearch = R.test(/^[A-Z]\S+/, childLoadingId) ? childLoadingId : `[data-testid='${childLoadingId}']`;
          const childDataIdSearch = R.test(/^[A-Z]\S+/, childDataId) ? childDataId : `[data-testid='${childDataId}']`;
          const foundComponent = wrapper.find(componentIdSearch);
          // If either loading or data component is found, we've succeeded
          const loadedComponent = foundComponent.find(childLoadingIdSearch);
          const dataComponent = foundComponent.find(childDataIdSearch);
          // Make sure we have at least one match. There can be > 1 if child components inherit the className
          expect(R.length(loadedComponent) || R.length(dataComponent)).toBeGreaterThan(0);

          // TODO act doesn't suppress the warning as it should
          // If we have an Apollo componentInstance, we use testing-library to await the query to run and the the child
          // componentInstance that is dependent on the query result to render. If we don't have an Apollo componentInstance,
          // this child will be rendered immediately without delay
          // resolves to {wrapper, component, render: {childComponent}}
          return waitForChildComponentRenderTask({
            componentId,
            childId: childDataId,
            waitLength
          }, wrapper);
        }
      ),
      mapToNamedResponseAndInputs('loading',
        ({waitLength, wrapper, childLoadingId, childDataId, foundContainer: {childComponent: foundContainer}}) => {
          expect(foundContainer.length).toEqual(1);
          // Make sure the componentInstance props are consistent since the last test run
          return waitForChildComponentRenderTask({
            componentId,
            childId: childLoadingId,
            // Some components go to data state immediately because there is nothing to load,
            // so check this before waiting for loading state
            alreadyChildId: childDataId,
            waitLength
          }, foundContainer);
        }
      ),
      mapToNamedResponseAndInputs('foundContainer',
        ({wrapper}) => {
          return waitForChildComponentRenderTask({
            componentId: 'ChakraProvider',
            childId: 'TestContainer',
            waitLength: waitLength
          }, wrapper);
        }
      )
    ])({wrapper, container, childLoadingId, childDataId});
  },
  [
    ['config', PropTypes.shape({
      authenticate: PropTypes.bool,
      componentId: PropTypes.string.isRequired,
      childLoadingId: PropTypes.string.isRequired,
      childDataId: PropTypes.string.isRequired,
      waitLength: PropTypes.number
    })],
    ['container', PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired],
    ['component', PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired],
    ['resolvedPropsContainer', PropTypes.func.isRequired]
  ], '_testRenderComponentContainer'
);

const _testRenderComponentMutationsTask = (
  {
    apolloConfig,
    mutationComponents,
    componentId,
    childDataId,
    childErrorId,
    waitLength
  }, wrapper, childComponent) => {
  // Store the state of the component's prop before the mutation
  // Store the state of the component's prop before the mutation
  const apolloRenderProps = childComponent.first().props();
  return composeWithChain([
    ({mutationResponseObjects, updatedComponent}) => {
      return of(R.map(mutationResponseObject => {
        const {mutationName, mutationResponse, updatedComponent} = mutationResponseObject;
        return {
          mutationName,
          // Return the render props before and after the mutations so we can confirm that values changed
          preMutationApolloRenderProps: apolloRenderProps,
          postMutationApolloRenderProps: updatedComponent.instance() ?
            updatedComponent.instance().props :
            updatedComponent.props(),
          // This isn't really needed. It just shows the return value of the mutation
          mutationResponse,
          // Just for testing
          updatedComponent
        };
      }, mutationResponseObjects));
    },
    // Call the mutate function of each mutation container. This will update the state of the mounted components
    // Then find the components
    ...mapObjToValues(
      (mutationComponent, mutationName) => {
        return mapTaskOrComponentToConcattedNamedResponseAndInputs(apolloConfig, 'mutationResponseObjects',
          () => {
            // Get the mutate function that was returned in the props sent to the component's render function
            // This mutate function is what HOC passes via render to the component for each composed
            // mutation component
            const {mutation, result, skip} = reqStrPathThrowing(mutationName, apolloRenderProps);
            return composeWithChain([
                mapToNamedResponseAndInputs('updatedComponent',
                  ({}) => {
                    const componentIdSearch = R.test(/^[A-Z]\S+/, componentId) ? componentId : `[data-testid='${componentId}']`;
                    return of(wrapper.find(componentIdSearch).first());
                  }
                ),
                // Wait for render again--this might be immediate
                mapToNamedResponseAndInputs('childRendered',
                  ({}) => {
                    return waitForChildComponentRenderTask({
                        componentId,
                        childId: childErrorId || childDataId,
                        waitLength
                      },
                      wrapper);
                  }
                ),
                // Call the mutate function
                mapToNamedResponseAndInputs('mutationResponse',
                  ({mutation, skip}) => {
                    const task = fromPromised(() => {
                      // We don't need to pass mutation variables because they are already set in the request
                      if (skip) {
                        throw Error(`Attempt to run a skipped mutation ${mutationName}, meaning its variables are not ready. This occurs when the component is ready before the mutation component is. Check the component renderChoicepoint settings to make sure the mutation component is awaited`);
                      }
                      return mutation();
                    })();
                    return task.orElse(error => {
                      // If testing error, return the error
                      return of(error);
                    });
                  }
                )
              ]
            )({mutation, mutationName, skip});
          }
        );
      },
      mutationComponents
    )
  ])({});
};

/**
 * Tests changes in the results of the same mutation run twice for each mutation in prePostMutationComparisons
 * We can tests things like updateDate in updatePaths that changes on each mutation
 * @param {String} clientOrComponent 'client' or 'component'. The key to use for each updatePaths object.
 * We use client if we're testing mutations with an ApolloClient. We use component if we're testing with an
 * Apollo Component
 * @param {Object} updatedPaths Keyed by mutation name, valued by an Object. We only care about the
 * client key of the Object, which are paths into the mutation response, such as updateMutation.
 * @param {[{Object}]} prePostMutationComparisons Array of objects in the form:
 * {mutationName, mutationResponse, preMutationApolloRenderProps, postMutationApolloRenderProps}
 * where the latter two are the result of calling the mutation once then again, or the before and after state of a single mutation
 */
const testMutationChanges = (clientOrComponent, updatedPaths, prePostMutationComparisons) => {
  // We should get a non-null mutation result for every mutationComponent
  R.forEach(
    prePostMutationComparisons => {
      const {
        mutationName,
        mutationResponse,
        preMutationApolloRenderProps,
        postMutationApolloRenderProps
      } = prePostMutationComparisons;
      // Make sure the mutation returned something
      expect(R.head(R.values(strPathOr([], 'result.data', mutationResponse)))).toBeTruthy();
      const updatedPathsForMutaton = R.propOr({client: []}, mutationName, updatedPaths)[clientOrComponent];
      if (updatedPathsForMutaton) {
        R.forEach(
          updatedPath => {
            // compare the pre mutation version to the post mutation.
            // if we are checking related query data, there should be no undefined values
            // If we are checking mutation results, the initial value can be undefined
            expect(strPathOr('undefined', updatedPath, preMutationApolloRenderProps)).not.toEqual(
              reqStrPathThrowing(updatedPath, postMutationApolloRenderProps)
            );
          },
          updatedPathsForMutaton
        );
      }
    },
    prePostMutationComparisons
  );
};

const _testRenderError = (
  {
    errorMaker,
    apolloConfigContainer,
    resolvedPropsContainer,
    componentId,
    childLoadingId,
    childDataId,
    childErrorId,
    mutationComponents,
    updatedPaths,
    waitLength,
    theme
  }, container, component, done) => {

  expect.assertions(
    3
  );

  const errors = [];
  return composeWithChain([
    mapToNamedResponseAndInputs('prePostMutationComparisons',
      // Once we are loaded, we've already run queries, so only call mutation functions here.
      // This will update the component with the mutated data.
      // We don't actually change the values explicitly when we mutate here, so we assert it worked
      // by checking the object's update timestamp at the end of the test
      ({
         apolloClient,
         mutationComponents,
         wrapper,
         childComponent,
         component,
         componentId,
         childDataId,
         childErrorId,
         props
       }) => {
        return _testRenderComponentMutationsTask({
          apolloConfig: {apolloClient},
          mutationComponents,
          componentId,
          childDataId,
          childErrorId,
          waitLength
        }, wrapper, component);
      }
    ),
    // Render component, calling queries
    mapToMergedResponseAndInputs(
      ({
         apolloClient,
         resolvedPropsContainer,
         componentId,
         childLoadingId,
         childDataId,
         childErrorId,
         errorMaker
       }) => {
        return _testRenderComponentTask(
          {
            apolloClient,
            componentId,
            childLoadingId,
            childDataId,
            childErrorId,
            waitLength,
            theme,
            authenticate: true,
            errorMaker
          },
          container,
          component,
          resolvedPropsContainer
        );
      }
    ),
    // Resolve the apolloConfigContainer. This resolves to {schema, apolloClient}
    mapToMergedResponseAndInputs(
      ({apolloConfigContainer}) => {
        return apolloConfigContainer;
      }
    )
  ])({
    apolloConfigContainer,
    resolvedPropsContainer,
    componentId,
    childLoadingId,
    childDataId,
    childErrorId,
    mutationComponents,
    errorMaker
  }).run().listen(
    defaultRunConfig({
      onResolved: ({component, prePostMutationComparisons}) => {
        // Just make sure the error child component exists. If there are no mutations, just check the component exists
        expect(strPathOr(component, '0.updatedComponent', prePostMutationComparisons)).toBeTruthy();
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
 */
export const propsFromParentPropsTask = v((chainedParentPropsTask, samplePropsTaskMaker) =>
    R.chain(
      // Chain the Result.Ok value to a Task combine the parent props with the props maker
      // Task Object -> Task Object
      parentContainerSampleProps => samplePropsTaskMaker(parentContainerSampleProps),
      chainedParentPropsTask
    ),
  [
    ['initialState', PropTypes.shape().isRequired],
    ['chainedParentPropsResultTask', PropTypes.shape().isRequired],
    ['samplePropsTaskMaker', PropTypes.func.isRequired]
  ],
  'propsFromParentPropsTask'
);

/**
 * Use this as the chainedParentPropsContainer function for chainSamplePropsForContainer
 * when chaining to a parent component.
 * Component or Task resolving to parent props from all the way up the view hierarchy
 * @param {Function} chainedSamplePropsForParent This should be the parent component's
 * call to chainSamplePropsForContainer
 * @param {Object} parentComponentViews The parent Apollo containers c object that defines the view names
 * @param {String} viewName The view name in parentComponentViews that refers to the child Apollo
 * container we want to link to the parent
 */
export const chainParentPropContainer = (
  {
    chainedSamplePropsForParent,
    parentComponentViews,
    viewName
  }) => {
  return (
    apolloConfig,
    {runParentContainerQueries, ...options},
    {render}
  ) => {
    return parentPropsForContainer(
      apolloConfig, {
        apolloConfigToSamplePropsContainer: (apolloConfig, {render}) => {
          return chainedSamplePropsForParent(
            apolloConfig,
            {runParentContainerQueries, runContainerQueries: runParentContainerQueries, ...options},
            {render}
          );
        },
        parentComponentViews,
        viewName
      },
      {render}
    );
  };
};

/**
 * Returns a function that resolves to a task or component that provides sample props for
 * Apollo component tests
 * @param {Function} chainedParentPropsContainer
 * Function expecting (apolloConfig, {runParentContainerQueries = false}, {render}), where
 * the render function must be given for component tests, and runParentContainerQueries if true
 * is passed to parent calls to chainSamplePropsForContainer to run the requests of the parent or not.
 * TODO I think we always need to run the parents requests to get legit props, so I can't remember
 * why this exists.
 * @param {Function} containers Unary function expecting apolloConfig that returns the apollo
 * requests for the container being testing
 * @returns {Function} See docs below
 */
export const chainSamplePropsForContainer = (
  {
    chainedParentPropsContainer,
    containers
  }) => {
  /**
   * Task Or Component that resolves sample props for component tests
   * @param {Object} apolloConfig
   * @param {Object} options
   * @param {String} options.containerName For debugging only. Assigns a name to the container
   * @param {Boolean} options.runParentContainerQueries Default false, set true when not testing rendering so the
   * parent containers can run.
   * @param {Boolean} options.runContainerQueries Default false. Always set false, used internally to make parents run
   * parent containers run their queries to give us the props we expect. For instance, a parent container
   * might fetch the userState for us and from that user state we know what regions to query
   * happen automatically when we test rendered the component
   * @param {Object} props Just the render prop. Other props
   * @param {Function} props.render render function for component calls
   * @returns {Task|Function} The task or component that resolves/renders the query respnose
   */
  return (
    apolloConfig, {
      containerName,
      runParentContainerQueries = false,
      runContainerQueries = false,
      ...options
    }, {render}) => {

    return apolloQueryResponsesContainer(
      apolloConfig, {
        containerName,
        // Apply these props from the "parent" to the queries
        resolvedPropsContainer: (apolloConfig, {render}) => {
          return chainedParentPropsContainer(
            apolloConfig,
            {runParentContainerQueries, ...options},
            {render}
          );
        },
        // Get the Apollo queries for the container since we can run the props through them and get the
        // structured query results that the component expect
        queryContainers: filterForQueryContainers(containers(apolloConfig)),
        runContainerQueries
      },
      {render}
    );
  };
};