/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import angular = require('angular');
import _ = require('lodash');
import './index.scss';
import './management/management.module';
import './i18n/i18n.module';

// fix angular-schema-form angular<1.7
Object.assign(angular, { lowercase: _.toLower, uppercase: _.toUpper });

let initInjector: ng.auto.IInjectorService = angular.injector(['ng']);
let $http: ng.IHttpService = initInjector.get('$http');
let $q: ng.IQService = initInjector.get('$q');
let configNoCache = { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } };
let ConstantsJSON: any;

fetchData()
  .then((constants: any) => initLoader(constants))
  .then((constants: any) => initTheme(constants))
  .then(bootstrapApplication);

function fetchData() {

  return $q.all(
    [$http.get('constants.json', configNoCache),
      $http.get('build.json', configNoCache)])
    .then((responses: any) => {
      ConstantsJSON = responses[0].data;
      let build = responses[1].data;
      angular.module('gravitee-management').constant('Build', build);
      ConstantsJSON = computeBaseURLs(ConstantsJSON);
      return $http.get(`${ConstantsJSON.envBaseURL}/portal`);
    })
    .then((response: any) => {
      let constants = _.merge(response.data, ConstantsJSON);
      angular.module('gravitee-management').constant('Constants', constants);

      if (constants.theme.css) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = constants.theme.css;
        document.head.appendChild(link);
      }
      return constants;
    })
    .catch((error) => {
      document.getElementById('gravitee-error').innerText = 'Management API unreachable or error occurs, please check logs';
      throw error;
    });
}

function computeBaseURLs(constants: any): any {
  if (constants.baseURL.endsWith('/')) {
    constants.baseURL = constants.baseURL.slice(0, -1);
  }
  const orgBaseURL = `${constants.baseURL}/organizations/${constants.orgId}`;
  const envBaseURL = `${orgBaseURL}/environments/${constants.envId}`;

  constants.orgBaseURL = orgBaseURL;
  constants.envBaseURL = envBaseURL;

  return constants;
}

function initLoader(constants: any) {
  const img = document.createElement('img');
  img.classList.add('gravitee-splash-screen');
  img.setAttribute('src', constants.theme.loader);

  document.getElementById('loader').appendChild(img);

  return $q.resolve(constants);
}

function initTheme(constants: any) {
  return $http.get(`./themes/${constants.theme.name}-theme.json`, configNoCache)
    .then((response: any) => {
      angular.module('gravitee-management').constant('Theme', response.data);
    }).catch(() => {
      return $http.get('./themes/default-theme.json', configNoCache).then((response: any) => {
        angular.module('gravitee-management').constant('Theme', response.data);
      });
    });
}

function bootstrapApplication() {
  angular.element(document).ready(function () {
    angular.bootstrap(document, ['gravitee-i18n', 'gravitee-management']);
  });
}
