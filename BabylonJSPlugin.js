const fs = require('fs');
const getLogger = require('webpack-log');
const path = require('path');
const log = getLogger({ name: 'webpack-batman' });

const getTextures = (materials) => {
  const paths = materials.map(material => {
    return `${material.diffuseTexture.name}`;
  })

  return [...new Set(paths)]
}

const copyFileWithFolders = async (src, dest) => {
  const folders = dest.split(path.sep).slice(0, -1);
  let currentPath = '';

  console.log(src, dest)
  if (!fs.existsSync(path.dirname(dest))) {
    for (const folder of folders) {
      currentPath += folder + path.sep;

      try {;
        await fs.promises.access(currentPath);
      } catch(e) {
        await fs.promises.mkdir(currentPath);
      }
    }
  }

  return fs.promises.copyFile(src, dest);
}

const copyFilesToDist = async (files, sourcePath, distPath) => {
  const copyPromises = files.map(file => copyFileWithFolders(`${sourcePath}${file}`, `./dist/${file}`))
  return Promise.all(copyPromises);
}

class BabylonJSPlugin {
  async findAndCopyAssets(fullPath, content) {
    const regExp = /SceneLoader\.ImportMeshAsync\(\s*['"].*['"],\s*['"](?<path>.*)['"],\s*['"](?<fileName>.*)['"],\s*.*\)/gm;
    const basePath = `${path.dirname(fullPath)}/`;
    let match = regExp.exec(content)?.groups;
    
    while (match) {
      const modelPath = `${basePath}${match.path}${match.fileName}`;
      const modelContent = JSON.parse(await fs.promises.readFile(modelPath, 'utf8'));
      const materials = modelContent.materials;
      const textures = getTextures(materials, basePath, match.path);
      const distPath = path.normalize(`./dist/${match.path}`);
      const files = [
        match.fileName,
        ...textures
      ]

      await copyFilesToDist(files, path.normalize(`${basePath}${match.path}`), distPath);
      match = regExp.exec(content)?.groups;
    }
  }

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

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('BabylonJSPlugin', (compilation, callback) => {
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
    });
  }
}

module.exports = BabylonJSPlugin;
