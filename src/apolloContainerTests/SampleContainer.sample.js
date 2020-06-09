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
import {of} from 'folktale/concurrency/task';
import {Ok} from 'folktale/result';
import {parentPropsForContainerTask} from '../componentTestHelpers';
import {composeWithChain, mapMonadByConfig} from 'rescape-ramda';
import {
  makeCurrentUserQueryContainer,
  mutateSampleUserStateWithProjectAndRegionTask,
  userOutputParams
} from 'rescape-place';

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
 */
export const apolloConfigToPropsResultTask = apolloConfig => {
  return parentPropsForContainerTask(
    apolloConfig,
    // Fake the parent
    apolloConfig => composeWithChain([
      ({userState, region, project}) => of({
        // Some props
        style: {
          width: 500,
          height: 500
        },
        userState,
        region,
        project,
        // scope limits queryUserRegions to these params
        scope: {name: 'Earth'}
      }),
      // Mutate the UserState to get cache-only data stored
      mapMonadByConfig({},
        ({apolloConfig, user}) => {
          return mutateSampleUserStateWithProjectAndRegionTask({
            apolloConfig,
            user,
            regionKey: 'earth',
            projectKey: 'shrangrila'
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
 * Task returning sample props from all the way up the view hierarchy
 * Not relevant for us since this is just a sample component and there is no hierarchy
 */
//export const chainedSamplePropsTask = propsFromParentPropsHelperTask(apolloConfigToPropsResultTask, samplePropsTaskMaker);
