import {makeRegionsQueryContainer, regionOutputParams} from 'rescape-apollo';
import {composeGraphqlQueryDefinitions} from 'rescape-helpers-component';

export const requests = {
  region: {
    query: {
      // Creates a function expecting a component to wrap and props
      queryRegions: makeRegionsQueryContainer(
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
        }
      )
    }
  }
};


export default (component, propsStructure) =>
  composeGraphqlQueryDefinitions
graphqlTasks[0](component, propsStructure);

/*
// Create the GraphQL Container.
const ContainerWithData = child => asyncComponent({
  resolve: () => {
    return taskToPromise(composeGraphqlRequestsTaskMaker(child, {id: 0}));
  }
});

const asyncContainer = ContainerWithData(Sample);
*/

