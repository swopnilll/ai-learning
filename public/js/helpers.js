/* Shared registry and HTML helpers. Loaded first; lessons use these to build their content. */
(function () {
  const A = '/assets/aws-icons/';
  const S = A + 'architecture-service/';
  const R = A + 'resource/';
  const G = A + 'architecture-group/';

  // Short names for the icons the lessons use. The full AWS set is in assets/aws-icons,
  // so adding a new one is a single line here.
  window.ICONS = {
    ec2: S + 'AmazonEC2.svg',
    vpc: S + 'AmazonVirtualPrivateCloud.svg',
    elb: S + 'ElasticLoadBalancing.svg',
    alb: R + 'ElasticLoadBalancingApplicationLoadBalancer.svg',
    rds: S + 'AmazonRDS.svg',
    s3: S + 'AmazonSimpleStorageService.svg',
    sms: S + 'AWSEndUserMessaging.svg',
    ses: S + 'AmazonSimpleEmailService.svg',
    secrets: S + 'AWSSecretsManager.svg',
    kms: S + 'AWSKeyManagementService.svg',
    iam: S + 'AWSIdentityandAccessManagement.svg',
    guardduty: S + 'AmazonGuardDuty.svg',
    inspector: S + 'AmazonInspector.svg',
    securityhub: S + 'AWSSecurityHub.svg',
    waf: S + 'AWSWAF.svg',
    ecs: S + 'AmazonElasticContainerService.svg',
    fargate: S + 'AWSFargate.svg',
    ecr: S + 'AmazonElasticContainerRegistry.svg',
    cloudwatch: S + 'AmazonCloudWatch.svg',
    cloudtrail: S + 'AWSCloudTrail.svg',
    route53: S + 'AmazonRoute53.svg',
    eventbridge: S + 'AmazonEventBridge.svg',
    sns: S + 'AmazonSimpleNotificationService.svg',
    ssm: S + 'AWSSystemsManager.svg',
    acm: S + 'AWSCertificateManager.svg',
    igw: R + 'AmazonVPCInternetGateway.svg',
    nat: R + 'AmazonVPCNATGateway.svg',
    router: R + 'AmazonVPCRouter.svg',
    nacl: R + 'AmazonVPCNetworkAccessControlList.svg',
    flowlogs: R + 'AmazonVPCFlowLogs.svg',
    eni: R + 'AmazonVPCElasticNetworkInterface.svg',
    resolver: R + 'AmazonRoute53Resolver.svg',
    routetable: R + 'AmazonRoute53RouteTable.svg',
    instance: R + 'AmazonEC2Instance.svg',
    user: R + 'User.svg',
    users: R + 'Users.svg',
    client: R + 'Client.svg',
    internet: R + 'Internet.svg',
    email: R + 'Email.svg',
    globe: R + 'Globe.svg',
    server: R + 'Server.svg',
    mobile: R + 'Mobileclient.svg',
    aws: G + 'AWSCloudlogo.svg',
    bedrock: S + 'AmazonBedrock.svg',
    sagemaker: S + 'AmazonSageMaker.svg',
    lambda: S + 'AWSLambda.svg',
    opensearch: S + 'AmazonOpenSearchService.svg',
    dynamodb: S + 'AmazonDynamoDB.svg',
    stepfunctions: S + 'AWSStepFunctions.svg',
    kendra: S + 'AmazonKendra.svg',
    comprehend: S + 'AmazonComprehend.svg',
    textract: S + 'AmazonTextract.svg',
    terraform: '/assets/logos/terraform.svg',
    postgres: '/assets/logos/postgresql.svg',
    docker: '/assets/logos/docker.svg',
    github: '/assets/logos/github.svg',
    python: '/assets/logos/python.svg',
    cloudflare: '/assets/logos/cloudflare.svg',
  };
  window.GROUP_ICONS = {
    cloud: G + 'AWSCloudlogo.svg',
    region: G + 'Region.svg',
    vpc: G + 'VirtualprivatecloudVPC.svg',
    public: G + 'Publicsubnet.svg',
    private: G + 'Privatesubnet.svg',
    account: G + 'AWSAccount.svg',
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dedent = (s) => {
    const lines = s.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
    const pad = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    return lines.map((l) => l.slice(pad)).join('\n');
  };

  const KEYWORDS = 'resource|module|variable|output|locals|data|terraform|provider|backend|lifecycle|required_providers|default_tags|versioning_configuration|rule|default_action|fixed_response';
  const HCL = new RegExp(
    '(#.*$)|("(?:[^"\\\\]|\\\\.)*")|^(\\s*)([A-Za-z_][A-Za-z0-9_]*)(?=\\s*=[^=])|\\b(' + KEYWORDS + ')\\b|\\b(true|false|null|\\d+)\\b',
    'gm'
  );
  function highlight(src) {
    return esc(src).replace(HCL, (m, com, str, ws, attr, kw, lit) => {
      if (com) return '<i class="c">' + com + '</i>';
      if (str) return '<i class="s">' + str + '</i>';
      if (attr) return ws + '<i class="a">' + attr + '</i>';
      if (kw) return '<i class="k">' + kw + '</i>';
      if (lit) return '<i class="n">' + lit + '</i>';
      return m;
    });
  }

  window.H = {
    esc,
    /** A Terraform snippet with the file it comes from. */
    code(file, src) {
      return (
        '<figure class="code"><figcaption><img src="' + ICONS.terraform + '" alt=""><span>' + esc(file) +
        '</span></figcaption><pre>' + highlight(dedent(src)) + '</pre></figure>'
      );
    },
    /** A terminal block. Lines starting with "$ " are commands, "# " are comments, the rest is expected output. */
    term(src, title) {
      const body = dedent(src).split('\n').map((l) => {
        if (l.startsWith('$ ')) return '<span class="cmd"><b>$</b> ' + esc(l.slice(2)) + '</span>';
        if (l.startsWith('# ')) return '<span class="com">' + esc(l) + '</span>';
        return '<span class="out">' + esc(l) + '</span>';
      }).join('\n');
      return '<figure class="term"><figcaption><i></i><i></i><i></i><span>' + esc(title || 'Try it: expected output') +
        '</span></figcaption><pre>' + body + '</pre></figure>';
    },
    callout(kind, title, html) {
      const label = { analogy: 'Analogy', gotcha: 'Gotcha', why: 'Why this way', proof: 'Prove it', note: 'Note', planned: 'Planned' }[kind] || 'Note';
      return '<aside class="callout ' + kind + '"><div class="callout-tag">' + label + '</div><div><h4>' + title + '</h4>' + html + '</div></aside>';
    },
    /** A note for a lesson (or part of one) whose infrastructure has been removed. The lesson itself is kept. */
    removed(title, html) {
      return '<aside class="callout note"><div class="callout-tag">Removed</div><div><h4>' + title + '</h4>' + html + '</div></aside>';
    },
    diagram(name, caption) {
      return '<figure class="dg-wrap"><div class="diagram" data-diagram="' + name + '"></div>' +
        (caption ? '<figcaption>' + caption + '</figcaption>' : '') + '</figure>';
    },
    widget(name) {
      return '<div class="widget" data-widget="' + name + '"></div>';
    },
    icon(name, size) {
      size = size || 40;
      return '<img class="aws-icon" src="' + ICONS[name] + '" width="' + size + '" height="' + size + '" alt="">';
    },
    img(src, caption) {
      return '<figure class="shot"><img src="' + src + '" alt="' + esc(caption || '') + '" loading="lazy" data-zoom>' +
        (caption ? '<figcaption>' + caption + ' <em>(click to enlarge)</em></figcaption>' : '') + '</figure>';
    },
    /** A row of fact cards: [{icon, title, text}] */
    cards(items) {
      return '<div class="cards">' + items.map((c) =>
        '<div class="card">' + (c.icon ? H.icon(c.icon, 36) : '') + '<div><h4>' + c.title + '</h4><p>' + c.text + '</p></div></div>'
      ).join('') + '</div>';
    },
    table(head, rows) {
      return '<div class="table-wrap"><table><thead><tr>' + head.map((h) => '<th>' + h + '</th>').join('') +
        '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>';
    },
  };

  window.Course = {
    sections: [],
    lessons: [],
    section(s) { this.sections.push(s); },
    add(l) { this.lessons.push(l); },
  };
})();
