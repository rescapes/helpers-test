import {

  makeRegionMutationContainer,
  regionOutputParams,
  regionQueryVariationContainers,
  userStateRegionMutationContainer,
  userStateRegionOutputParams,
  userStateRegionsQueryContainer,
  variationContainerAuthDependency
} from '@rescapes/place';
import {adopt} from 'react-adopt';
import * as R from 'ramda';
import {reqStrPathThrowing, strPathOr, toNamedResponseAndInputs} from '@rescapes/ramda';
import {
  authenticatedUserLocalContainer,
  containerForApolloType,
  deleteTokenCookieMutationRequestContainer,
  getRenderPropFunction,
  isAuthenticatedLocal, nameComponent, queryLocalTokenAuthContainer, tokenAuthMutationContainer
} from '@rescapes/apollo';
import {e, getClassAndStyle} from '@rescapes/helpers-component';

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
        {
          apolloConfig: R.merge(apolloConfig,
            {
              options: {
                variables: props => {
                  return R.prop('regionFilter', props);
                },
                // Pass through error so we can handle it in the component
                errorPolicy: 'all'
              }
            }
          ),
          regionConfig: {}
        }
      )),
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
          {
            apolloConfig: R.merge(apolloConfig,
              {
                options: {
                  variables: props => {
                    return R.pick(['id'], R.propOr({}, 'region', props));
                  },
                  // Pass through error so we can handle it in the component
                  errorPolicy: 'all'
                }
              })
          },
          {
            userRegionOutputParams: userStateRegionOutputParams()
          },
          props
        );
      },

      mutateRegion: props => {
        return makeRegionMutationContainer(
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
        const userRegion = R.compose(
          ({userRegions, region}) => {
            if (!R.length(userRegions) || !region) {
              return null;
            }
            return R.find(
              userRegion => {
                return R.eqProps('id', region, reqStrPathThrowing('region', userRegion)), userRegions;
              },
              userRegions
            );
          },
          toNamedResponseAndInputs('region',
            props => strPathOr(null, 'region', props)
          ),
          toNamedResponseAndInputs('userRegions',
            props => strPathOr([], 'userState.data.userRegions', props)
          )
        )(props);

        const propsWithUserRegion = R.merge(props, {userRegion});
        return userStateRegionMutationContainer(
          R.merge(apolloConfig, {
            options: {
              // We can't mutate if there is no userRegion. This happens when there is no authenticated user
              // or no userRegions in the props that matches props.region
              skip: !userRegion,
              variables: (props) => {
                return R.pick(['id'], reqStrPathThrowing('userScope.region', props));
              },
              errorPolicy: 'all'
            }
          }),
          {
            userRegionOutputParams: userStateRegionOutputParams()
          }
        )(propsWithUserRegion);
      }
    }]);
};

// This produces a component class that expects a props object keyed by the keys in apolloContainersLogout
// The value at each key is the result of the corresponding query container or the mutate function of the corresponding
// mutation container
const AdoptedApolloContainer = adopt(apolloContainersSample());
// Wrap AdoptedApolloContainer in
export default AdoptedApolloContainer;
