/* =========================================================
   CONFIG — edit copy, personas and images here
   ========================================================= */

/* Persona assets: when the final icons are ready, set `image` to a file path or URL
   (e.g. 'img/creator.webp'). Until then the emoji is used as a placeholder.
   Icons are also drawn onto the downloadable result card. */
const PERSONAS = {
  creator: {
    name: 'Creator',
    emoji: '✨',
    image: 'img/creator.webp',
    value: 'Imagination',
    power: 'Turn imaginative ideas into shareable stories.',
    blurb:
      'You turn bold ideas into eye-catching stories, videos and trends that people love to watch, share and talk about.',
    head: 'Ready to bring your ideas to life?',
    desc: 'You have the power to turn a fresh idea into creative content that captures attention and gets people talking.',
    ask: 'What’s one idea you could turn into something people will want to share?',
    color: '#E61E2A',
    ink: '#ffffff',
  },
  inclusive: {
    name: 'Inclusive Marketer',
    emoji: '🤝',
    image: 'img/inclusive-marketer.webp',
    value: 'Inclusion',
    power: 'Connect different voices and build welcoming communities.',
    blurb:
      'You bring people together, listen to different voices and build online communities where everyone feels welcome, seen and heard.',
    head: 'Ready to make everyone feel included?',
    desc: 'You can create campaigns that welcome different perspectives and help more people feel seen and heard.',
    ask: 'How could you make your next project more inclusive?',
    color: '#0E7C5A',
    ink: '#ffffff',
  },
  trust: {
    name: 'Trust Builder',
    emoji: '🔒',
    image: 'img/trust-builder.webp',
    value: 'Integrity',
    power: 'Earn trust through honesty and transparency.',
    blurb:
      'You communicate honestly and openly, earning audience loyalty and helping people make choices they feel confident about.',
    head: 'Ready to build trust?',
    desc: 'You can create stronger relationships by communicating honestly and helping people make informed choices.',
    ask: 'How could you make your next message more transparent?',
    color: '#2F5DFF',
    ink: '#ffffff',
  },
  explorer: {
    name: 'Explorer',
    emoji: '🚀',
    image: 'img/explorer.webp',
    value: 'Courage',
    power: 'Experiment with new ideas and digital tools.',
    blurb:
      'You love testing new ideas, AI and digital tools, and you’re not afraid to try something no one has done.',
    head: 'Ready to try something new?',
    desc: 'You can explore emerging tools, test bold ideas and discover new ways to connect with audiences.',
    ask: 'What new tool or idea could you experiment with this week?',
    color: '#7B3FE4',
    ink: '#ffffff',
  },
  strategist: {
    name: 'Strategist',
    emoji: '🧠',
    image: 'img/strategist.webp',
    value: 'Passion',
    power: 'Pursue marketing goals with research and planning.',
    blurb:
      'You dig into data and audience insights, then use research and smart planning to hit your campaign goals.',
    head: 'Ready to turn insight into action?',
    desc: 'You can use research and data to make smarter decisions and build a plan that works towards a clear goal.',
    ask: 'What would you want to learn about your audience before launching a campaign?',
    color: '#00B8D9',
    ink: '#000054',
  },
  changemaker: {
    name: 'Changemaker',
    emoji: '⚡',
    image: 'img/changemaker.webp',
    value: 'Impact',
    power: 'Turn insight into meaningful, measurable results.',
    blurb:
      'You use marketing to tackle real-world challenges, aiming for campaigns that create positive change and results you can measure.',
    head: 'Ready to make a difference?',
    desc: 'You can use marketing to address real-world challenges and create positive change.',
    ask: 'What is one issue you could help tackle through a digital campaign?',
    color: '#FAC800',
    ink: '#000054',
  },
};

/* Each option is [student-facing text, persona key]. Options are shown as A–F in this order. */
const QUESTIONS = [
  {
    title: 'Your marketing superpower',
    text: 'A brand gives you one day to create something amazing. What would you do first?',
    options: [
      ['Create an eye-catching TikTok video.', 'creator'],
      ['Study what customers really want.', 'strategist'],
      ['Start a conversation with the online community.', 'inclusive'],
      ['Try a completely new digital tool.', 'explorer'],
      ['Make sure the brand’s message is honest.', 'trust'],
      ['Find a way to make a positive difference.', 'changemaker'],
    ],
  },
  {
    title: 'Campaign challenge',
    text: 'Your brand’s TikTok campaign isn’t getting attention. What’s your next move?',
    options: [
      ['Ask followers what content they enjoy.', 'inclusive'],
      ['Experiment with an unusual campaign idea.', 'explorer'],
      ['Create a fun new video trend.', 'creator'],
      ['Set a clear goal and improve the results.', 'changemaker'],
      ['Check the views, clicks and engagement data.', 'strategist'],
      ['Check whether the message feels authentic.', 'trust'],
    ],
  },
  {
    title: 'Product launch',
    text: 'You are launching a new product for Gen Z. What excites you most?',
    options: [
      ['Making sure the product promises are truthful.', 'trust'],
      ['Designing the visuals and storytelling.', 'creator'],
      ['Creating a product launch with real social impact.', 'changemaker'],
      ['Building a community around the product.', 'inclusive'],
      ['Planning how to reach the right audience.', 'strategist'],
      ['Testing AI or interactive experiences.', 'explorer'],
    ],
  },
  {
    title: 'Online reputation',
    text: 'A brand receives negative comments online. What would you do?',
    options: [
      ['Explore a new way to solve the problem.', 'explorer'],
      ['Listen to customers and make everyone feel heard.', 'inclusive'],
      ['Make changes that improve customer experience.', 'changemaker'],
      ['Investigate the cause and plan a solution.', 'strategist'],
      ['Create a thoughtful response video.', 'creator'],
      ['Respond openly and honestly.', 'trust'],
    ],
  },
  {
    title: 'Your dream job',
    text: 'You join a digital marketing team. Which role sounds most exciting?',
    options: [
      ['Marketing impact and growth specialist.', 'changemaker'],
      ['Content creator and storyteller.', 'creator'],
      ['Brand trust and reputation specialist.', 'trust'],
      ['Digital innovation specialist.', 'explorer'],
      ['Social media community manager.', 'inclusive'],
      ['Campaign planner and data analyst.', 'strategist'],
    ],
  },
  {
    title: 'Success moment',
    text: 'Your campaign is a huge success! What makes you most proud?',
    options: [
      ['Customers genuinely trust our brand.', 'trust'],
      ['My campaign made a measurable difference.', 'changemaker'],
      ['I brought people together.', 'inclusive'],
      ['I introduced an exciting new idea.', 'explorer'],
      ['My strategy worked exactly as planned.', 'strategist'],
      ['People love and share my creative content.', 'creator'],
    ],
  },
];


const BOARD = {
  endpoint: 'https://superpower-board.duy-doan6.workers.dev',
  maxLen: 140,
  maxName: 20,
  pollMs: 30000, // students' phones
  kioskPollMs: 8000, // big screen (#board)
  kioskMaxCols: 10, // big screen: most columns allowed (more = smaller text)
};
/* QR code shown on the big screen (points to the quiz). To change it, paste a new image as a
   data URI or a file path such as 'img/qr.png'. Leave empty to show the web address instead. */
const JOIN_QR = 'img/qr.png';

/* TV background: tweak the flight here */
const STARFIELD = {
  speed: 0.035, // how fast we fly forward (bigger = faster)
  rotation: 0.015, // slow swirl of the tunnel, radians per second (0 = none)
  density: 1, // 1 = normal, 0.5 = half as many stars, 1.5 = more
};
