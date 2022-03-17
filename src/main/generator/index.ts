import { renderDefinitions } from '../renderer';
import { IIndeksdProject, IGeneratedFile, IParsedFile } from '../types';

export function generateProject(
  project: IIndeksdProject,
): Array<IGeneratedFile> {
  let result: Array<IGeneratedFile> = [];

  project.files.forEach((file: IParsedFile) => {
    // Index file for this namespace
    result.push({
      type: 'GeneratedFile',
      name: file.sourceFile.name,
      ext: 'ts',
      path: file.sourceFile.path,
      body: renderDefinitions(file.body),
    });
  });

  return result;
}
