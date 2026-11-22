Course.section({ id: 'intro', title: 'Start here', icon: 'bedrock', blurb: 'Placeholder lesson. Send me the content and I will build the real ones.' });

Course.add({
  section: 'intro', id: 'welcome', title: 'Welcome', mins: 1, status: 'live',
  lede: 'This tutorial shell is ready. Lessons go in lessons/, one file each.',
  body: () => `
    <h2>Icons available</h2>
    ${H.cards([
      { icon: 'bedrock', title: 'Amazon Bedrock', text: 'Foundation models as an API.' },
      { icon: 'sagemaker', title: 'Amazon SageMaker', text: 'Build, train and deploy models.' },
      { icon: 'lambda', title: 'AWS Lambda', text: 'Serverless functions.' },
    ])}
  `,
});
