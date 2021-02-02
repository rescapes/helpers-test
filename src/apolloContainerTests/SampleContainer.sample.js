/**
 * Created by Andy Likuski on 2018.03.07
 * Copyright (c) 2018 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as R from 'ramda';
import T from 'folktale/concurrency/task';

const {of} = T;
import {parentPropsForContainer} from '../componentTestHelpers.js';
import {composeWithChain, mapMonadByConfig, reqStrPathThrowing} from '@rescapes/ramda';
import {
  apolloQueryResponsesContainer, composeWithComponentMaybeOrTaskChain, containerForApolloType,
  currentUserQueryContainer, getRenderPropFunction,
  mapTaskOrComponentToNamedResponseAndInputs, nameComponent,
  userOutputParams
} from '@rescapes/apollo';
import {filterForQueryContainers} from '../apolloContainerTestHelpers.js';
import {apolloContainersSample} from './SampleContainer.js';
import {mutateSampleUserStateWithProjectsAndRegionsContainer} from '@rescapes/place';

/**
 * @file Normally links sample props from a parent component to a Region component. In this case
 * we just have a Region component with a fake parent
 */

/**
 * Returns a function that expects state and parentProps for testing and returns a Task that resolves the props
 */
//export const samplePropsTaskMaker = makeApolloTestPropsTaskFunction(mapStateToProps, mapDispatchToProps, queries.samples);


/**
 * Task returning sample parent props from all the way up the view hierarchy
 * @param {Object} apolloConfig. The apolloConfig allows us to get props from a theoretical parent component.
 * We fake the parent here, pretending that our Region component is named 'currentRegion' in the parent component
 * @param {boolean} runParentContainerQueries This would normally be passed to the parent
 */
export const chainedParentPropsForSampleContainer = (apolloConfig, {runParentContainerQueries = false}, {render}) => {
  return parentPropsForContainer(
    apolloConfig,
    {
      // Fake the parent
      apolloConfigToSamplePropsContainer: (apolloConfig, {render}) => {
        return composeWithComponentMaybeOrTaskChain([
          // Mutate the UserState to get cache-only data stored
          nameComponent('sampleDataComponent',
            ({
               sampleResponses: {userStateResponse, regions, projects, locations},
               render
             }) => {
              return containerForApolloType(
                apolloConfig,
                {
                  render: getRenderPropFunction({render}),
                  response: {
                    // Some props
                    style: {
                      width: '500px',
                      height: '500px'
                    },
                    // Sample paging params
                    page: 1,
                    pageSize: 1,

                    // Authentication with the test user
                    username: 'test',
                    password: 'testpass',

                    regionFilter: {idIn: R.map(R.prop('id'), regions)},
                    userState: reqStrPathThrowing('data.mutate.userState', userStateResponse),
                    region: R.head(regions),
                    project: R.head(projects),
                    // scope limits queryUserRegions to these params
                    scope: {name: 'Earth'},
                    // In testing we use a memory router to change routes
                    // Pretend the user had been trying to access the protected path, so that we redirect
                    // unauthorized users to login
                    memoryRouterInitialEntries: [
                      {pathname: '/protected', key: 'protected'}
                    ],
                    // Sample paths for authentication
                    loginPath: '/login',
                    protectedPath: '/protected',
                    locations
                  }
                }
              );
            }),
          mapTaskOrComponentToNamedResponseAndInputs(apolloConfig, 'sampleResponses',
            ({userResponse, render}) => {
              const user = reqStrPathThrowing('data.currentUser', userResponse);
              // Resolves to {userStateResponse, regions, projects, locations}
              return mutateSampleUserStateWithProjectsAndRegionsContainer(
                apolloConfig, {
                  user: R.pick(['id'], user),
                  regionKeys: ['earth', 'zorgon'],
                  projectKeys: ['shrangrila', 'pangea'],
                  render
                }
              );
            }),
          mapTaskOrComponentToNamedResponseAndInputs(apolloConfig, 'userResponse',
            ({render}) => {
              return currentUserQueryContainer(apolloConfig, userOutputParams, {render});
            }
          )
        ])({render});
      },
      // Normally this is the parent views function
      parentComponentViews: props => ({views: {currentRegion: props}}),
      viewName: 'currentRegion'
    },
    {render}
  );
};

/**
 * Task combining result of chainedParentPropsForRegionTask
 * @param {Object} apolloConfig
 * @param {Object} options
 * @param {String} options.containerName For debugging only. Assigns a name to the container
 * @param {Boolean} options.runParentContainerQueries Default false, set true when not testing rendering so the
 * parent containers can run.
 * @param {Boolean} options.runContainerQueries Default false. Always set false, used internally to make parents run
 * parent containers run their queries to give us the props we expect. For instance, a parent container
 * might fetch the userState for us and from that user state we know what regions to query
 * happen automatically when we test rendered the component
 * @param {Object} props Juest the render prop. Other props c
 * @param {Function} props.render render function for component calls
 * @returns {Task|Function} The task or component that resolves/renders the query respnose
 */
export const configToChainedPropsForSampleContainer = (
  apolloConfig, {
    containerName,
    runParentContainerQueries = false,
    runContainerQueries = false,
    ...options
  }, {render}
) => {
  return apolloQueryResponsesContainer(
    apolloConfig, {
      containerName,
      // Apply these props from the "parent" to the queries
      resolvedPropsContainer: (apolloConfig, {render}) => {
        return chainedParentPropsForSampleContainer(
          apolloConfig,
          {runParentContainerQueries, ...options},
          {render}
        );
      },
      // Get the Apollo queries for the container since we can run the props through them and get the
      // structured query results that the component expect
      queryContainers: filterForQueryContainers(apolloContainersSample(apolloConfig)),
      runContainerQueries
    },
    {render}
  );
};