import {regionOutputParams} from 'rescape-place';
import Sample from './SampleComponent';
import {adopt} from 'react-adopt';
import {apolloHOC, makeMutationRequestContainer, makeQueryContainer} from 'rescape-apollo';
import * as R from 'ramda';

// The __typename that represent the fields of the Region type. We need these to query by object types rather than
// just by primitives, e.g. to query by geojson: {feature: {type: 'FeatureCollection'}} to get objects whose
// geojson type is a 'FeatureCollection'
// TODO, these should be derived from the remote schema
export const readInputTypeMapper = {
  //'data': 'DataTypeofLocationTypeRelatedReadInputType'
  'geojson': 'FeatureCollectionDataTypeofRegionTypeRelatedReadInputType'
};

// Sample query of the region object that is in the rescape-apollo remote schema
const _makeRegionsQueryContainer = R.curry((apolloConfig, {outputParams}, props) => {
  return makeQueryContainer(
    apolloConfig,
    {name: 'regions', readInputTypeMapper, outputParams},
    props
  );
});

// Sample mutation of the region object that is in the rescape-apollo remote schema
export const _makeRegionMutationContainer = R.curry((apolloConfig, {outputParams}, props) => {
  return makeMutationRequestContainer(
    apolloConfig,
    {
      name: 'region',
      outputParams
    },
    props
  );
});

// Each query and mutation expects a container to compose then props
export const apolloContainers = {
  // Creates a function expecting a component to wrap and props
  queryRegions: _makeRegionsQueryContainer(
    {
      options: {
        variables: (props) => {
          return {
            id: parseInt(props.region.id)
          };
        },
        // Pass through error so we can handle it in the component
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams
    }
  ),
  mutateRegion: _makeRegionMutationContainer(
    {
      options: {
        variables: (props) => {
          return R.propOr({}, 'region', props);
        },
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams
    }
  )
};

// This produces a component class that expects a props object keyed by the keys in apolloContainers
// The value at each key is the result of the corresponding query container or the mutate function of the corresponding
// mutation container
const AdoptedApolloContainer = adopt(apolloContainers);
// Wrap AdoptedApolloContainer in
const apolloHoc = apolloHOC(AdoptedApolloContainer);
export default apolloHoc(Sample);
// No apolloHOC would be needed if Sample is just a render function:
//e(apolloContainerComposed, {}, Sample)
