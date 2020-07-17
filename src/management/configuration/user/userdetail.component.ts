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
import GroupService from '../../../services/group.service';
import NotificationService from '../../../services/notification.service';
import UserService from '../../../services/user.service';
import RoleService from '../../../services/role.service';
import { IScope } from 'angular';
import { StateService } from '@uirouter/core';
import _ = require('lodash');

interface IUserDetailComponentScope extends ng.IScope {
  selectedOrganizationRole: string[];
  selectedEnvironmentRole: any;
  userApis: any[];
  userApplications: any[];
  userEnvironments: any[];
}

const UserDetailComponent: ng.IComponentOptions = {
  bindings: {
    selectedUser: '<',
    groups: '<',
    organizationRoles: '<',
    environmentRoles: '<',
    apiRoles: '<',
    applicationRoles: '<',
    environments: '<'
  },
  template: require('./user.html'),
  controller: function (
    $mdDialog: angular.material.IDialogService,
    NotificationService: NotificationService,
    GroupService: GroupService,
    UserService: UserService,
    RoleService: RoleService,
    $scope: IUserDetailComponentScope,
    $rootScope: IScope,
    $window,
    $state: StateService
  ) {
    'ngInject';
    this.$rootScope = $rootScope;
    this.$onInit = () => {
      $scope.selectedOrganizationRole = _.map(_.filter(this.selectedUser.roles, role => role.scope === 'organization'), role => role.id);
      let envRoles = {};
      Object.keys(this.selectedUser.envRoles).forEach(envId => {
        envRoles[envId] = _.map(this.selectedUser.envRoles[envId], role => role.id);
      });
      $scope.selectedEnvironmentRole = envRoles;
      $scope.userApis = [];
      $scope.userApplications = [];
    };

    this.getUserPicture = () => {
      return UserService.getUserAvatar(this.selectedUser.id);
    };

    this.remove = (ev: Event, group: any) => {
      ev.stopPropagation();
      $mdDialog.show({
        controller: 'DialogConfirmController',
        controllerAs: 'ctrl',
        template: require('../../../components/dialog/confirmWarning.dialog.html'),
        clickOutsideToClose: true,
        locals: {
          msg: '',
          title: 'Are you sure you want to remove the user from the group "' + group.name + '"?',
          confirmButton: 'Remove'
        }
      }).then((response) => {
        if (response) {
          GroupService.deleteMember(group.id, this.selectedUser.id).then(() => {
            NotificationService.show(this.selectedUser.displayName + ' has been removed from the group "' + group.name + '"');
            UserService.getUserGroups(this.selectedUser.id).then((response) =>
              this.groups = response.data
            );
          });
        }
      });
    };

    this.updateGroupRole = (group) => {
      let member = {
        id: this.selectedUser.id,
        roles: group.roles
      };

      let promise = GroupService.addOrUpdateMember(group.id, [member]);
      if (promise) {
        promise.then(() => {
          NotificationService.show('Role has been updated');
          UserService.getUserGroups(this.selectedUser.id).then((response) =>
            this.groups = response.data
          );
        });
      }
    };

    this.updateOrganizationsRole = (selectOpened: boolean, organizationRoles: any[]) => {
      if (selectOpened) {
        UserService.updateUserRoles(this.selectedUser.id, 'ORGANIZATION', 'DEFAULT', organizationRoles);
        NotificationService.show('Roles for organization "DEFAULT" updated');
      }
    };

    this.updateEnvironmentsRole = (selectOpened: boolean, envId: string, environmentRoles: any[]) => {
      console.log($scope.selectedEnvironmentRole);
      if (selectOpened) {
        UserService.updateUserRoles(this.selectedUser.id, 'ENVIRONMENT', envId, environmentRoles);
        NotificationService.show('Roles for environment "' + envId + '" updated');
      }
    };

    this.addGroupDialog = () => {
      let that = this;
      GroupService.list().then((groups) => {
        $mdDialog.show({
          controller: 'DialogAddUserGroupController',
          controllerAs: 'dialogCtrl',
          template: require('./dialog/addusergroup.dialog.html'),
          clickOutsideToClose: true,
          locals: {
            groups: groups.data,
            apiRoles: this.apiRoles,
            applicationRoles: this.applicationRoles
          }
        }).then((groupWithRole) => {
          that.updateGroupRole(groupWithRole);
        });
      });
    };

    this.resetPasswordDialog = () => {
      $mdDialog.show({
        controller: 'DialogConfirmController',
        controllerAs: 'ctrl',
        template: require('../../../components/dialog/confirmWarning.dialog.html'),
        clickOutsideToClose: true,
        locals: {
          title: 'Are you sure you want to reset password of user "' + this.selectedUser.displayName + '"?',
          msg: 'An email with a link to change it will be sent to him',
          confirmButton: 'Reset'
        }
      }).then((response) => {
        if (response) {
          UserService.resetPassword(this.selectedUser.id).then(() => {
            NotificationService.show('The password of user "' + this.selectedUser.displayName + '" has been successfully reset');
          });
        }
      });
    };

    this.loadUserApis = () => {
      UserService.getMemberships(this.selectedUser.id, 'api').then((response) => {
          let newApiList = [];
          _.forEach(response.data.metadata, (apiMetadata: any, apiId: string) => {
            newApiList.push({
              id: apiId,
              name: apiMetadata.name,
              version: apiMetadata.version,
              visibility: apiMetadata.visibility
            });
          });
          $scope.userApis = _.sortBy(newApiList, 'name');
        }
      );
    };

    this.loadUserApplications = () => {
      UserService.getMemberships(this.selectedUser.id, 'application').then((response) => {
          let newAppList = [];
          _.forEach(response.data.metadata, (appMetadata: any, appId: string) => {
            if (!appMetadata.status || appMetadata.status !== 'archived') {
              newAppList.push({
                id: appId,
                name: appMetadata.name,
                type: appMetadata.type
              });
            }
          });
          $scope.userApplications = _.sortBy(newAppList, 'name');
        }
      );
    };

    this.loadUserEnvironments = () => {
      let userEnvironments = [];
      Object.keys(this.selectedUser.envRoles).forEach(env => {
        userEnvironments.push({
          name: env,
          roles: _.map(this.selectedUser.envRoles[env], role => role.name).join(', ')
        });
      });
      $scope.userEnvironments = userEnvironments;
    };

    this.backToUsers = () => {
      let page = $window.localStorage.usersTablePage || 1;
      let query = $window.localStorage.usersTableQuery || undefined;
      $state.go('management.settings.users', { q: query, page: page });
    };
  }
};

export default UserDetailComponent;
