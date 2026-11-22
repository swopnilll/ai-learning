Course.section({ id: 'ml-fundamentals', title: 'Machine Learning Fundamentals', icon: 'sagemaker', blurb: 'Probability, core ML ideas, neural network architectures and the metrics used to judge models.' });

// Each group is a subsection in the sidebar. Replace a lesson's `lede` and `body` when real content arrives.
[
  ['Probabilistic Concepts', ['Sampling', 'Determinism', 'Distribution']],
  ['Machine Learning Concepts', ['Supervision', 'Self-supervision', 'Log-likelihood', 'Gradient descent', 'Backpropagation', 'Loss function', 'Hyperparameter tuning']],
  ['Neural Network Architectures', ['Feedforward', 'Recurrent', 'Transformer']],
  ['Metrics', ['Accuracy', 'F1', 'Precision', 'Recall', 'Cosine similarity', 'Cross entropy']],
].forEach(([group, titles]) => titles.forEach((title) => Course.add({
  section: 'ml-fundamentals', group, id: 'ml-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title, mins: 1, status: 'planned',
  lede: 'Content coming soon.',
  body: () => '<p>Content for <b>' + title + '</b> will be added here.</p>',
})));
