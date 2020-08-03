import {
  makeRegionMutationContainer,
  makeRegionsQueryContainer,
  regionOutputParams,
  userStateRegionMutationContainer, userStateRegionsQueryContainer
} from 'rescape-place';
import {adopt} from 'react-adopt';
import * as R from 'ramda';
import {makeMutationRequestContainer, makeQueryContainer, normalizeSampleRegionPropsForMutating} from 'rescape-apollo';
import {reqStrPathThrowing, strPathOr, toNamedResponseAndInputs} from 'rescape-ramda';
import {userStateRegionOutputParams} from 'rescape-place';

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
  return {
    // Creates a function expecting a component to wrap and props
    queryRegions: props => {
      return makeRegionsQueryContainer(
        {
          apolloConfig: R.merge(apolloConfig,
            {
              options: {
                variables: props => {
                  return {
                    id: reqStrPathThrowing('region.id', props)
                  };
                },
                // Pass through error so we can handle it in the component
                errorPolicy: 'all'
              }
            }
          )
        },
        {
          outputParams: regionOutputParams
        },
        props
      );
    },

    // Test sequential queries
    queryUserRegions: props => {
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
        // We just need the userState and scope
        R.pick(['render', 'children', 'userState', 'scope'], props)
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
              return R.propOr({}, 'region', props);
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
  };
};

// This produces a component class that expects a props object keyed by the keys in apolloContainers
// The value at each key is the result of the corresponding query container or the mutate function of the corresponding
// mutation container
const AdoptedApolloContainer = adopt(apolloContainers());
// Wrap AdoptedApolloContainer in
//const apolloHoc = apolloHOC(AdoptedApolloContainer);
export default AdoptedApolloContainer;
