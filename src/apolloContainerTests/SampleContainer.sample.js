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
import {of} from 'folktale/concurrency/task';
import {parentPropsForContainerTask} from '../componentTestHelpers';
import {composeWithChain, mapMonadByConfig} from 'rescape-ramda';
import {apolloQueryResponsesTask, makeCurrentUserQueryContainer, userOutputParams} from 'rescape-apollo';
import {filterForQueryContainers} from '../apolloContainerTestHelpers';
import {apolloContainers} from './SampleContainer';
import {mutateSampleUserStateWithProjectsAndRegionsContainer} from 'rescape-place';

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
export const chainedParentPropsForSampleTask = (apolloConfig, {runParentContainerQueries = false}) => {
  return parentPropsForContainerTask(
    apolloConfig,
    // Fake the parent
    apolloConfig => composeWithChain([
      ({userState, regions, projects}) => of({
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
        userState,
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
      }),
      // Mutate the UserState to get cache-only data stored
      mapMonadByConfig({},
        ({apolloConfig, user}) => {
          return mutateSampleUserStateWithProjectsAndRegionsContainer({
            apolloConfig,
            user: R.pick(['id'], user),
            regionKeys: ['earth', 'zorgon'],
            projectKeys: ['shrangrila', 'pangea']
          });
        }
      ),
      mapMonadByConfig({name: 'user', strPath: 'data.currentUser'},
        ({apolloConfig}) => {
          return makeCurrentUserQueryContainer(apolloConfig, userOutputParams, {});
        }
      )
    ])({apolloConfig}),
    // Normally this is the parent views function
    props => ({views: {currentRegion: props}}),
    'currentRegion'
  );
};

/**
 * Task combining result of chainedParentPropsForRegionTask
 * @param {Object} apolloConfig
 * @param {Object} options
 * @param {Boolean} options.runParentContainerQueries Default false, set true when not testing rendering so the
 * parent containers can run.
 * @param {Boolean} options.runContainerQueries Default false. Always set false, used internally to make parents run
 * parent containers run their queries to give us the props we expect. For instance, a parent container
 * might fetch the userState for us and from that user state we know what regions to query
 * happen automatically when we test rendered the component
 */
export const configToChainedPropsForSampleTask = (apolloConfig, {runParentContainerQueries=false, runContainerQueries=false, ...options}) => {
  return apolloQueryResponsesTask(
    // Apply these props from the "parent" to the queries
    chainedParentPropsForSampleTask(apolloConfig, {runParentContainerQueries, ...options}),
    // Get the Apollo queries for the container since we can run the props through them and get the
    // structured query results that the component expect
    filterForQueryContainers(apolloContainers(apolloConfig)),
    runContainerQueries
  );
};