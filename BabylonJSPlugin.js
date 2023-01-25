const fs = require('fs');
const getLogger = require('webpack-log');
const path = require('path');
const log = getLogger({ name: 'webpack-batman' });

const PLUGIN_NAME = 'BabylonJSPlugin';
const GET_SCENE_LOADER_METHODS_PATH_REGEX = /SceneLoader\.ImportMeshAsync\(\s*['"].*['"],\s*['"](?<path>.*)['"],\s*['"](?<fileName>.*)['"],\s*.*\)/gm

/**
 * TODO: Work properly with development and production environments
 * TODO: Make it work with other methods other than ImportMeshAsync
 * https://doc.babylonjs.com/typedoc/classes/BABYLON.SceneLoader
 * 
 * Provavelmente oq eu vou fazer vai ser, puxar os arquivos a serem alterados
 * antes do build, fazer a busca pelo metodo SceneLoader e criar o fakePath que aponta pra ./modules/<hash>/
 * e guardar no array de files
 * 
 * Depois no after build pegar esse array e fazer as cópias dos roles
 */


class BabylonJSPlugin {
  files = [];

  getTexturesFromBabylonMesh(materials) {
    const paths = materials.map(material => {
      return `${material.diffuseTexture.name}`;
    })
  
    return [...new Set(paths)]
  }

  async createFoldersAndCopyFile(src, dest) {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
   
    const buffer = Buffer.alloc(1024 * 1024);
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);
   
    readStream.pipe(writeStream);
   
    return new Promise((resolve, reject) => {
      readStream.on('end', resolve);
      writeStream.on('error', reject);
    });
  }

  async copyFilesToDist(files, filesPath, distPath) {
    const copyPromises = files.map(file => this.createFoldersAndCopyFile(`${filesPath}${file}`, `${distPath}${file}`))
    return Promise.all(copyPromises);
  }

  async findMeshAndTextures(scriptPath, match) {
    const meshPath = `${scriptPath}${match.path}${match.fileName}`;
    const mesh = JSON.parse(await fs.promises.readFile(meshPath, 'utf8'));
    const materials = mesh.materials;
    const textures = this.getTexturesFromBabylonMesh(materials, scriptPath, match.path);

    return [
      match.fileName,
      ...textures
    ]
  }
  
  async findAndCopyAssets(scriptFilePath, content) {
    const regExp = GET_SCENE_LOADER_METHODS_PATH_REGEX;
    const scriptPath = `${path.dirname(scriptFilePath)}/`;
    let match = regExp.exec(content)?.groups;
    
    while (match) {
      const files = await this.findMeshAndTextures(scriptPath, match);
      const distPath = path.normalize(`${process.cwd()}/dist/${match.path}`);
      await this.copyFilesToDist(files, path.normalize(`${scriptPath}${match.path}`), distPath);
      match = regExp.exec(content)?.groups;
    }
  }

  //  PROVAVELMENTE N VOU MAIS USAR, ENTÃO SEM REFACTOR
  async getAllTsFiles(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        return this.getAllTsFiles(res);
      } else if (path.extname(res) === '.ts') {
        return res;
      }
    }));
    return files.flat().filter(item => item !== undefined);
  }

  copy3DModelsAndTexturesToDist(compilation, callback) {
    // console.log(compilation.modules)

    this.getAllTsFiles('./src')
      .then((paths) => {
        paths.forEach(path => {
          fs.promises.readFile(path, 'utf8')
            .then(content => this.findAndCopyAssets(path, content))
        })
      })
      .catch(err => {
        console.log(err)
      });

    callback();
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync(PLUGIN_NAME, this.copy3DModelsAndTexturesToDist.bind(this));
  }
}

module.exports = BabylonJSPlugin;
