import {
  findUserScopeInstance, isActive,
  regionMutationContainer,
  regionOutputParams, regionOutputParamsMinimized,
  regionQueryVariationContainers, regionsQueryContainer,
  userStateRegionMutationContainer,
  userStateRegionOutputParams,
  userStateRegionsQueryContainer,
  variationContainerAuthDependency
} from '@rescapes/place';
import {adopt} from 'react-adopt';
import * as R from 'ramda';
import {strPathOr, reqStrPathThrowing} from '@rescapes/ramda';
import {
  apolloResponseFilterOrEmpty,
  authenticatedUserLocalContainer,
  containerForApolloType,
  getRenderPropFunction,
  queryLocalTokenAuthContainer
} from '@rescapes/apollo';

/**
 * Each query and mutation expects a container to compose then props
 * @param {Object} apolloConfig Optionally supply {apolloClient} to run requests as tasks instead of components
 * @return {{queryRegions: (function(*=): *), mutateRegion: (function(*=): *), queryUserRegions: (function(*=): *)}}
 */
export const apolloContainersSample = (apolloConfig = {}) => {
  return R.mergeAll([
    {
      // Look fo the auth token in the cache
      queryLocalTokenAuthContainer: props => {
        return queryLocalTokenAuthContainer(apolloConfig, props);
      },
      // Cache lookup to see if the user is authenticated
      queryAuthenticatedUserLocalContainer: props => {
        return authenticatedUserLocalContainer(apolloConfig, props);
      }
    },

    variationContainerAuthDependency(
      apolloConfig,
      'queryAuthenticatedUserLocalContainer.data.currentUser',
      regionQueryVariationContainers(
        R.merge(apolloConfig,
          {
            options: {
              variables: props => {
                return R.prop('regionFilter', props);
              },
              // Pass through error so we can handle it in the component
              errorPolicy: 'all'
            }
          }
        )
      )
    ),
    {
      // Test sequential queries
      queryUserRegions: props => {
        // Skip if not authenticated
        if (!strPathOr(false, 'queryAuthenticatedUserLocalContainer.data.currentUser', props)) {
          return containerForApolloType(
            apolloConfig,
            {
              render: getRenderPropFunction(props),
              response: null
            }
          );
        }

        return userStateRegionsQueryContainer(
          R.merge(apolloConfig,
            {
              options: {
                variables: props => {
                  return R.pick(['id'], R.propOr({}, 'region', props));
                },
                // Pass through error so we can handle it in the component
                errorPolicy: 'all'
              }
            }),
          {
            userRegionOutputParams: userStateRegionOutputParams()
          },
          props
        );
      },
      // Query full detail for the active region in userRegions if any
      queryActiveRegions: props => {
        const userRegions = props => {
          return R.compose(
            queryUserStateRegions => {
              return apolloResponseFilterOrEmpty(
                'userStates.0.data.userRegions',
                userRegion => isActive(userRegion),
                queryUserStateRegions
              );
            },
            props => R.prop('queryUserRegions', props)
          )(props);
        };

        return regionsQueryContainer(
          R.merge(apolloConfig,
            {
              options: {
                skip: !R.length(userRegions(props)),
                variables: props => {
                  return {
                    id: R.compose(
                      reqStrPathThrowing('region.id'),
                      R.head,
                      props => userRegions(props)
                    )(props)
                  };
                },
                // Pass through error so we can handle it in the component
                errorPolicy: 'all',
                partialRefetch: true
              }
            }
          ),
          {
            outputParams: regionOutputParamsMinimized
          },
          props
        );
      },


      mutateRegion: props => {
        return regionMutationContainer(
          R.merge(apolloConfig, {
            options: {
              // We can't mutate without a props.region
              skip: !R.propOr(false, 'region', props),
              variables: (props) => {
                return R.propOr({}, 'region', props);
              },
              errorPolicy: 'all'
            }
          }),
          {
            outputParams: regionOutputParams
          }
        )(props);
      },

      // Mutate the user region
      mutateUserRegion: props => {
        const mutateProps = R.merge(
          props,
          {
            // Extract the UserRegion based on props.queryActiveRegions.data.regions.0
            // Until we don't have a matching UserRegion we won't be able to mutate
            // Note, we could also just search within userStateResponse.data.userState.data.userRegions[].activity.active
            // Not sure what is better at this point.
            userRegion: findUserScopeInstance(
              {
                userStatePropPath: 'userState',
                userScopeCollectName: 'userRegions',
                scopeName: 'region',
                scopeInstancePropPath: 'queryActiveRegions.data.regions.0'
              },
              props
            ),
            userState: R.propOr(null, 'userState', props) ||
              strPathOr(null, 'queryCurrentUserState.data.userStates.0', props)
          }
        );
        return userStateRegionMutationContainer(
          R.merge(apolloConfig, {
            // We disallow mutate until we have a userState and userRegion
            skip: R.any(
              prop => R.complement(R.propOr)(null, prop, mutateProps),
              ['userState', 'userRegion']
            )
          }),
          {
            userRegionOutputParams: userStateRegionOutputParams()
          },
          mutateProps
        );
      }
    }]);
};

// This produces a component class that expects a props object keyed by the keys in apolloContainersLogout
// The value at each key is the result of the corresponding query container or the mutate function of the corresponding
// mutation container
const AdoptedApolloContainer = adopt(apolloContainersSample());
// Wrap AdoptedApolloContainer in
export default AdoptedApolloContainer;
