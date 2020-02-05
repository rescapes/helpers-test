import {makeRegionsQueryContainer, regionOutputParams, makeRegionMutationContainer} from 'rescape-place';
import {composeGraphqlQueryDefinitions} from 'rescape-helpers-component';
import Sample from './SampleComponent';

// Each query and mutation expects a container to compose then props
export const apolloContainers = [
  // Creates a function expecting a component to wrap and props
  makeRegionsQueryContainer(
    {
      options: {
        variables: (props) => ({
          id: props.region.id
        }),
        // Pass through error so we can handle it in the component
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams,
      propsStructure: {
        id: 0
      }
    },
  ),
  makeRegionMutationContainer(
    {
      options: {
        errorPolicy: 'all'
      }
    },
    {
      outputParams: regionOutputParams
    }
  )
];

// This produces a function expecting props
export default composeGraphqlQueryDefinitions(apolloContainers)(Sample);

/*
// Create the GraphQL Container.
const ContainerWithData = child => asyncComponent({
  resolve: () => {
    return taskToPromise(composeGraphqlRequestsTaskMaker(child, {id: 0}));
  }
});

const asyncContainer = ContainerWithData(Sample);
*/

