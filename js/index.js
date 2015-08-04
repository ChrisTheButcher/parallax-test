angular.module('ngParallaxer', [])
  .directive('ngPlxRoot', ['$window', function($window) {
    return {
      restrict: 'A',
      controller: function() {
        var lastRAF, numCallbacks = 0,
            callbacks = [],
            center = { x: undefined, y: undefined },
            target = { x: undefined, y: undefined },
            actual = { x: undefined, y: undefined };
        
        var isAttached = false,
            updateTarget, resizeHandler;
        
        this.register = function(cb) {
          callbacks.push(cb);
          numCallbacks = callbacks.length;
        };
        
        var smoothing = 20;
        
        this.setSmoothing = function(val) {
          smoothing = val;
        };
        
        this.setTargetPercent = function(px,py) {
        	target.x = center.x * 2 * px;
          target.y = center.y * 2 * py;
        };
        
        this.attachTo = function(elem) {
          if (isAttached) return;
          isAttached = true; 
          
          target.x = actual.x = center.x = elem[0].offsetWidth / 2;
          target.y = actual.y = center.y = elem[0].offsetHeight / 2;
          
          elem.on("mousemove", updateTarget = function(e) {
            target.x = e.offsetX;
            target.y = e.offsetY;
          });
          
          $window.addEventListener("deviceorientation", function(e) {
            var gamma = (e.gamma || 0) / 180 + 1;
            var beta = (e.beta || 0) / 180 + 1;
            target.x = gamma * center.x;
            target.y = beta * center.y;
          })
          
          angular.element($window).on("resize", resizeHandler = function() {
            center.x = elem[0].offsetWidth / 2;
            center.y = elem[0].offsetHeight / 2;
          });
          
          (function self() {
            actual.x = (target.x + actual.x * smoothing) / (smoothing + 1);
            actual.y = (target.y + actual.y * smoothing) / (smoothing + 1);

            var dx = (actual.x - center.x) / center.x;
            var dy = (actual.y - center.y) / center.y;
            
            for(var i=0;i<numCallbacks;i++) {
              callbacks[i].call(undefined, dx, dy);
            }
            
            lastRAF = $window.requestAnimationFrame(self);
          })();
        };
        
        this.detachFrom = function(elem) {
          elem.off("mousemove", updateTarget);
          $window.off("resize", resizeHandler);
          isAttached = false;
          if(lastRAF) $window.cancelAnimationFrame(lastRAF);
        };
      },
      link: function(scope, elem, attrs, ctrl) {
        ctrl.attachTo(elem);
        
        var smoothing = scope.$eval(attrs.ngPlxSmoothing);
        if(angular.isUndefined(smoothing)) smoothing = 20;
        ctrl.setSmoothing(smoothing);
        
        scope.$on('$destory', function() {
          ctrl.detach(scope, elem, attrs);
        });
      } 
    };
  }])
  .directive('ngPlxLayer', function() {
  
  	  var getPropertyName = (function() {
      var actual, possible = [
            'transform',
            'WebkitTransform', 
            'MozTransform', 
            'OTransform', 
            'msTransform'];

      return function(elem) {
        var i = 0;
        while(actual === undefined && i < possible.length) {
          if (elem[0].style[possible[i]] !== undefined) actual = possible[i];
          else i++;
        }
        return actual;
      };
    })();
    
    return {
      restrict: 'A',
      require: "^^ngPlxRoot",
      link: function(scope, elem, attrs, ctrl) { 
        
        if (!getPropertyName(elem)) return;
        
        var ax = 0, ay = 0;
        
        ax = scope.$eval(attrs.ngPlxX);
        ay = scope.$eval(attrs.ngPlxY);
              
        ctrl.register(function(dx,dy) {
          
          elem[0].style[getPropertyName()] = "translate3d(" + 
            ax * dx + "px, " + 
            ay * dy + "px, 0)";
        });
      }
    };
  });

angular.module('parallaxTest', ['ngParallaxer'])
	.directive("autoUpdater", ['$timeout', function($timeout) {
  
    return {
      restrict: "A",
      require: "^ngPlxRoot",
      link: function(scope, elem, attr, ctrl) {

        var auto = true, cancel, autoUpdater = function() {
          var angle = Math.random() * Math.PI * 2;
          var dist = Math.random() * 0.25 + 0.75;
          ctrl.setTargetPercent(Math.cos(angle) * dist * 0.5 + 0.5, Math.sin(angle) * dist * 0.5 + 0.5);
          if(auto) cancel = $timeout(autoUpdater, 1750);
        };

       	cancel = $timeout(autoUpdater, 100);
        
        elem.on("mouseover", function() { 
          auto = false;
          if(cancel) $timeout.cancel(cancel);
        });
        elem.on("mouseout", function() { 
          auto = true; 
          cancel = $timeout(autoUpdater, 5000);
        });
      }
    };
  
  }]);