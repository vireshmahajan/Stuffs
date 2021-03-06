/* Directives */
  /**
  * directives Modules
  *
  * Description
  */
  angular.module('directives', []);
  angular.module('directives').directive('typeAhead',function(ordersService, itemsService){
    var ser;

    var linker = function(scope, element, attrs){
        ser = {
          suppliername : ordersService.getSupplierName,
          itemname : itemsService.getItemName,
          nafdacdrugs: itemsService.getNafdacDrug
        };
        scope.selectedItem ={
          suppliername: '',
          itemname: '',
          nafdacDrug: ''
        };
        element.typeahead({
          source: function(query, process){
            return ser[attrs.thName](query,function(results){
              return process(results);
            });
          },
          updater: function(item){
            scope.selectedItem[attrs.thName] = item;
            scope.$apply();
            return item;
          }
        });
    };
    return{
      restrict: 'A',
      link: linker
    };
  });
  angular.module('directives').directive('onFinish',function($timeout){
    return {
      restrict: 'A',
      link: function(scope, element, attr){
        if(scope.$last === true){
          $timeout(function(){
            switch (attr.onFinish){
              case "panorama":
                $('.panorama').panorama({
                   //nicescroll: false,
                   showscrollbuttons: false,
                   keyboard: true,
                   parallax: false
                });
              break;
              case "tableheader":
                $('table.table').fixedHeader();
              break;
              case "checkViewState":
                scope.$emit('onFinishLoaded', true);
              break;
              default:
              break;
            }
          });
          
        }
      }
    };
  });
  angular.module('directives').directive('modalbox', [function(){
    return {
      link: function($scope, iElm, iAttrs, controller) {
        $(iElm).on('click',function(){
          $('#mopop').modal('show');
        });
      }
    };
  }]);
  /**
  * directives Module
  *
  * Description
  */
  angular.module('directives').directive('toggleActiveList', [function(){
    // Runs during compile
    return {
      link: function($scope, iElm, iAttrs, controller) {
        iElm.on('click','li',function(e){
          e.preventDefault();
          $('ul.list-block li').removeClass('active');
          $(e.currentTarget).addClass('active');
        });
      }
    };
  }]);
  angular.module('directives').directive('orderActionButton', function(ordersService){
    function getStatus (status){
        var d;
        switch(status){
          case 'pending order':
            d = 'supplied';
            //scope.orders[attrs.thisIndex].next ="Supplied";
          break;
          case 'supplied':
            d = 'paid';
            //scope.orders[attrs.thisIndex].next ="Paid";
          break;
          case 'paid':
           d = 'Complete';
          break;
          case 'received':
           d = 'paid';
          break;
          default:
          break;
        }
        return d;
    }

    return {
      link: function(scope, element, attrs, controller){
        var invoiceNo, index;
        //Observe index
        attrs.$observe('index', function(newValue){
          index = newValue;
          scope.kush.next = getStatus(scope.kush.orderStatus);
          //bindEmAll(index, scope, element);
          //console.log(scope.kush);
        });

        //Bind to 
        element.on('click', function(e){
          e.preventDefault();

          var o ={
            status : getStatus(scope.kush.orderStatus),
            itemData : scope.kush.itemData[0],
            amount : scope.kush.orderAmount,
            order_id : scope.kush._id,
            invoiceno : scope.kush.orderInvoice,
            amountSupplied: scope.kush.amountSupplied
          }
          //scope.$apply();
          ordersService.updateOrder(o, function(r){
            scope.kush.orderStatus = r.result;
            scope.kush.next = getStatus(r.result);
            console.log(r);
          });
        });
      },
      scope : {
        kush : "="
      }
    };
  });

  angular.module('directives').directive('tooltip', function(){
      return {
          link: function(scope, element, attrs){
              element.tooltip({
                placement: attrs.tooltipPosition || 'top'
              });
          }
      }
  });

  angular.module('directives').directive('scrollBar', function(){
      return {
          link: function(scope, element, attrs){
            //if(attrs.activate)
              $(element).on('scrollbar', function(){
                  if(element.height() >= attrs.maxContainerHeight){
                      element.slimScroll({
                          height: attrs.maxContainerHeight+'px',
                          distance: '0'
                      });
                  }
              });
          }
      };
  });
  angular.module('directives').directive('pagination', [function(){
    function link(scope, element, attrs){
      scope.pageno = 0;
      scope.limit = 10;
      $('button.prevbtn', element).on('click', function(e){
        var page = scope.pageno - 1;
        if(scope.pageno === 1) return false;
        scope.pageTo({pageNo: page, limit: scope.limit, cb: function(r){
          if(r) scope.pageno--;
        }});
      });
      $('button.nextbtn', element).on('click', function(e){
        var page = scope.pageno + 1;
        scope.pageTo({pageNo: page, limit: scope.limit, cb: function(r){
          if(r) scope.pageno++;
        }});
      });
      scope.pagelimit = function(limit){
        scope.pageTo({pageNo: scope.pageno, limit: limit, cb: function(r){
          if(r) scope.limit = limit;
        }});        
      };
    }
    return {
      link: link,
      scope: {
        pageTo: '&'
      },
      templateUrl: '/templates/pagination'
    };
  }]);
  angular.module('directives').directive('panorama', function(){
    return {
      link: function (scope, element, attrs){
        element.panorama({
           //nicescroll: false,
           showscrollbuttons: false,
           keyboard: true,
           parallax: false
        });         
      }
    };
  });
  angular.module('directives').directive('editable', [function(){
    function link(scope, element, attrs){

      // $(document).on('focusout','.editable-input', function(e){
      //   var changed = $(e.currentTarget).val();
      //   if(changed.length > 0){
      //     console.log(attrs.index);
      //   }
      // });
      element.on('click', function(e){
        var ct = e.currentTarget;

        if($(ct).hasClass('on-edit')) return false;
        $('<input type="text" focus class="editable-input" placeholder="'+$(element).text()+'">').insertAfter(ct);
        $(ct).addClass('on-edit');

        var inputElement = $(element).next('input.editable-input')[0];
        $(inputElement).one('focusout', function(e){
          var changed = $(e.currentTarget).val();
          if(changed.length > 0){
            scope.lcn({name: changed, index: attrs.index});
          }
          $(ct).removeClass('on-edit');
          inputElement.remove();
        });
      });
    }
    // return {
    //   link:link,
    //   scope: {
    //     lcn: '&editable'
    //   }
    // };
  }]);

angular.module('directives').directive('printable', ['$compile','$http','$window','$timeout', function($compile, $http, $window, $timeout){
  var template = '';

  function link (scope, element, attrs){
    var templateFile = attrs.printTpl;
    var toPrint = '#'+attrs.printable;
    element.on('click', function(e){
      scope.checkfunc({cb: function(r){
        console.log(typeof(scope.checkfunc));
        console.log(scope.printScope);
        if(!r) return false;
        //Remove the print-div html if 
        //it exist in the DOM
        $('.print-div', toPrint).remove();

        //Get the HTML for the target (element to be printed ) DOM element
        var sourceHTML = $(toPrint).html();

        //Create a new DOM element
        var target = $('<div>').addClass('print-div');

        //Fetch the template from the server
        $http.get('/templates/'+templateFile+'-tpl.jade')
        .success( function(data){
          //Add the template returned
          template = $compile(data)(scope);  

          //insert the template into the new DOM element
          target.html(template);

          //Add the new DOM element to the 
          //source DOM element container
          $(toPrint).append(target);

          //Fix the order sheet html into the template
          $('.print-div', toPrint).find('.source-html').html(sourceHTML);  

          //Remove elements we dont want in our print-out
          $('.print-div', toPrint).find('.noprint').remove();

          $timeout(function(){
            //var w = $window.open(null, 'PrintWindow', "width=420,height=230,resizable,scrollbars=yes,status=1");
            var w = $window.open();
            $(w.document.body).html($('.print-div', toPrint).html());
            });          
        }, 500);              
      }});
    });

  }
  function printfunc(){
    
  }
  return {
    //templateUrl: '/templates/supplier-cart-tpl.jade',
    link: link,
    controller: printfunc,
    scope: {
      printable: '@',
      printTpl: '@',
      printScope: '=',
      checkfunc: '&'
    }
  };
}]);
