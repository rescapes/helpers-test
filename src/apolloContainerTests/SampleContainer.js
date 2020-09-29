import {
  makeRegionMutationContainer,
  regionOutputParams,
  regionQueryVariationContainers,
  userStateRegionMutationContainer,
  userStateRegionOutputParams,
  userStateRegionsQueryContainer,
  variationContainerAuthDependency
} from 'rescape-place';
import {adopt} from 'react-adopt';
import * as R from 'ramda';
import {reqStrPathThrowing, strPathOr, toNamedResponseAndInputs} from 'rescape-ramda';
import {
  authenticatedUserLocalContainer,
  containerForApolloType,
  deleteTokenCookieMutationRequestContainer,
  getRenderPropFunction,
  isAuthenticatedLocal, tokenAuthMutationContainer
} from 'rescape-apollo';


// The __typename that represent the fields of the Region type. We need these to query by object types rather than
// just by primitives, e.g. to query by geojson: {feature: {type: 'FeatureCollection'}} to get objects whose
// geojson type is a 'FeatureCollection'
// TODO, these should be derived from the remote schema
export const readInputTypeMapper = {
  //'data': 'DataTypeofLocationTypeRelatedReadInputType'
  'geojson': 'FeatureCollectionDataTypeofRegionTypeRelatedReadInputType'
};


/**
 * Each query and mutation expects a container to compose then props
 * @param {Object} apolloConfig Optionally supply {apolloClient} to run requests as tasks instead of components
 * @return {{queryRegions: (function(*=): *), mutateRegion: (function(*=): *), queryUserRegions: (function(*=): *)}}
 */
export const apolloContainers = (apolloConfig = {}) => {
  return R.mergeAll([
    // Cache lookup to see if the user is authenticated
    {
      queryAuthenticatedUserLocalContainer: props => {
        return authenticatedUserLocalContainer(apolloConfig, props)
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
      mutateTokenAuth: props => {
        return tokenAuthMutationContainer(
          R.merge(apolloConfig,
            {
              options: {
                variables: props => {
                  return R.pick(['username', 'password'], props);
                },
                // Pass through error so we can handle it in the component
                errorPolicy: 'all'
              }
            }
          ),
          {},
          props
        );
      },
      mutateDeleteTokenCookie: props => {
        return deleteTokenCookieMutationRequestContainer(
          R.merge(apolloConfig,
            {
              options: {
                variables: () => {
                  return {};
                },
                // Pass through error so we can handle it in the component
                errorPolicy: 'all'
              }
            }
          ),
          {},
          props
        );
      },
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
        return userStateRegionMutationContainer(
          R.merge(apolloConfig, {
            options: {
              variables: (props) => {
                return R.pick(['id'], reqStrPathThrowing('scope.region', props));
              },
              errorPolicy: 'all'
            }
          }),
          {
            userRegionOutputParams: userStateRegionOutputParams()
          }
        )(
          R.merge(
            props,
            {
              userRegion: R.compose(
                ({userRegions, region}) => R.find(
                  userRegion => R.eqProps('id', region, reqStrPathThrowing('region', userRegion)), userRegions
                ),
                toNamedResponseAndInputs('region',
                  props => reqStrPathThrowing('region', props)
                ),
                toNamedResponseAndInputs('userRegions',
                  props => strPathOr([], 'userState.data.userRegions', props)
                )
              )(props)
            }
          )
        );
      }
    }]);
};

// This produces a component class that expects a props object keyed by the keys in apolloContainers
// The value at each key is the result of the corresponding query container or the mutate function of the corresponding
// mutation container
const AdoptedApolloContainer = adopt(apolloContainers());
// Wrap AdoptedApolloContainer in
//const apolloHoc = apolloHOC(AdoptedApolloContainer);
export default AdoptedApolloContainer;
