import { ServiceQuestionsResult } from '../service-walkthrough-types';
import { getAddAuthDefaultsApplier, getUpdateAuthDefaultsApplier } from '../utils/auth-defaults-appliers';
import { getResourceSynthesizer, getResourceUpdater } from '../utils/synthesize-resources';
import { getPostAddAuthMetaUpdater, getPostUpdateAuthMetaUpdater } from '../utils/amplify-meta-updaters';
import { getPostAddAuthMessagePrinter, getPostUpdateAuthMessagePrinter } from '../utils/message-printer';
import { supportedServices } from '../../supported-services';

/**
 * Factory function that returns a ServiceQuestionsResult consumer that handles all of the resource generation logic.
 * The consumer returns the resourceName of the generated resource.
 * @param context The amplify context
 */
export const getAddAuthHandler = (context: any) => async (request: ServiceQuestionsResult) => {
  const serviceMetadata = supportedServices[request.serviceName];
  const { cfnFilename, defaultValuesFilename, provider } = serviceMetadata;
  let projectName = context.amplify.getProjectConfig().projectName.toLowerCase();
  const disallowedChars = /[^A-Za-z0-9]+/g;
  projectName = projectName.replace(disallowedChars, '');
  const requestWithDefaults = await getAddAuthDefaultsApplier(context, defaultValuesFilename, projectName)(request);
  await getResourceSynthesizer(
    context,
    cfnFilename,
    provider,
  )(requestWithDefaults)
    .then(req => req.resourceName!)
    .then(getPostAddAuthMetaUpdater(context, { service: requestWithDefaults.serviceName, providerName: provider }))
    .then(getPostAddAuthMessagePrinter(context.print))
    .catch(err => {
      context.print.info(err.stack);
      context.print.error('There was an error adding the auth resource');
      context.usageData.emitError(err);
      process.exitCode = 1;
    });
  return requestWithDefaults.resourceName!;
};

export const getUpdateAuthHandler = (context: any) => async (request: ServiceQuestionsResult) => {
  const { cfnFilename, defaultValuesFilename, provider } = supportedServices[request.serviceName];
  const requestWithDefaults = await getUpdateAuthDefaultsApplier(context, defaultValuesFilename, context.updatingAuth)(request);
  await getResourceUpdater(
    context,
    cfnFilename,
    provider,
  )(requestWithDefaults)
    .then(req => req.resourceName!)
    .then(getPostUpdateAuthMetaUpdater(context))
    .then(getPostUpdateAuthMessagePrinter(context.print))
    .catch(err => {
      context.print.info(err.stack);
      context.print.error('There was an error updating the auth resource');
      context.usageData.emitError(err);
      process.exitCode = 1;
    });
  return requestWithDefaults.resourceName!;
};
