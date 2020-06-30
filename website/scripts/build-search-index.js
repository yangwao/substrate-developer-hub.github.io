const fs = require('fs');
const lunr = require('lunr');
const path = require('path');

function getIdxDocFromFile(filePath, component, subcomponent) {
  const pathMatch = filePath.match(/^.*\/docs\/(.*)\.md$/);
  if (!pathMatch) {
    throw new Error(`${filePath} does not have expected format.`);
  }

  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const contentsMatch = fileContents.match(/^---\ntitle: (.+)\n---\n\n(.*)$/s);
  if (!contentsMatch) {
    throw new Error(`The file at ${filePath} does not have expected format.`);
  }

  const title = contentsMatch[1].startsWith('"') && contentsMatch[1].endsWith('"')
              ? contentsMatch[1].slice(1, -1)
              : contentsMatch[1];
  
  return {
    component: component,
    subcomponent: subcomponent,
    path: pathMatch[1],
    title: title,
    content: contentsMatch[2],
  }
}

const docs = [];

// index Knowledge Base
const sectionNames = {
  'advanced': 'Advanced',
  'getting-started': 'Getting Started',
  'integrate': 'Integrate',
  'learn-substrate': 'Learn Substrate',
  'runtime': 'Runtime',
  'smart-contracts': 'Smart Contracts',
}

fs.readdirSync(path.join('..', 'docs', 'knowledgebase')).forEach((dir) => {
  const absoluteDocDir = path.join('..', 'docs', 'knowledgebase', dir);
  if (!fs.lstatSync(absoluteDocDir).isDirectory()) {
    return;
  }

  if (!sectionNames[dir]) {
    throw new Error(`Cannot find section for ${dir}.`);
  }

  fs.readdirSync(absoluteDocDir).forEach((file) => {
    if (!file.endsWith('.md')) {
      return;
    }

    // TODO: the contentsMatch regex breaks on this file
    if ('glossary.md' === file) {
      console.warn('TODO: the contentsMatch regex breaks on glossary.md');
      return;
    }

    docs.push(getIdxDocFromFile(path.join(absoluteDocDir, file), 'Knowledge Base', sectionNames[dir]));
  });
});

// index tutorials
const tutNames = {
  'build-a-dapp': 'Build a dApp',
  'create-your-first-substrate-chain': 'First Chain',
  'start-a-private-network': 'Private Network',
  'add-a-pallet-to-your-runtime.md': 'Add a Pallet',
  'create-a-pallet.md': 'Create a Pallet',
  'visualize-node-metrics.md': 'Node Metrics',
}

fs.readdirSync(path.join('..', 'docs', 'tutorials')).forEach((tut) => {
  if (!tutNames[tut]) {
    throw new Error(`Cannot find tutorial for ${tut}.`);
  }

  const absoluteTutDir = path.join('..', 'docs', 'tutorials', tut);
  if (fs.lstatSync(absoluteTutDir).isDirectory()) {
    fs.readdirSync(absoluteTutDir).forEach((file) => {
      if (!file.endsWith('.md')) {
        return;
      }

      docs.push(getIdxDocFromFile(path.join(absoluteTutDir, file), 'Tutorials', tutNames[tut]));
    });

    return;
  }

  if (!tut.endsWith('.md')) {
    return;
  }

  docs.push(getIdxDocFromFile(path.join(absoluteTutDir), 'Tutorials', tutNames[tut]));
});

console.log(`Crawled ${docs.length} documents.`);
// docs.forEach((doc) => {
//   console.log(JSON.stringify({
//     component: doc.component,
//     subcomponent: doc.subcomponent,
//     path: doc.path,
//     title: doc.title,
//   }, null, 2));
// });

const idx = lunr(function() {
  this.ref('path');
  this.field('title');
  this.field('content');

  docs.forEach((doc) => {
    this.add(doc)
  }, this);
});

const idxFilePath = path.join('data', 'search-index.json');
fs.writeFileSync(idxFilePath, JSON.stringify(idx));
console.log(`Search index written to ${idxFilePath}.`);
